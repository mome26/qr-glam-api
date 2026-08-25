import {
    Injectable,
    Logger,
    NotFoundException,
    Inject,
    forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository, In } from 'typeorm';
import { Guest } from './entities/guest.entity';
import { GuestQueryDto } from './dto/guest-query.dto';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';
import { QrCode } from '../qr-codes/entities/qr-code.entity';
import { Event } from '../events/entities/event.entity';
import { CreateGuestDto } from './dto/create-guest.dto';
import { UpdateGuestDto } from './dto/update-guest.dto';
import { BulkUpdateGuestsDto } from './dto/bulk-update-guests.dto';
import { BulkDeleteGuestsDto } from './dto/bulk-delete-guests.dto';
import { getNextNumericIdForEvent } from '../qr-codes/utils/numeric-id.util';
import { generateQrLink } from '../qr-codes/utils/qr-link.util';
import { EventsService } from '../events/events.service';

@Injectable()
export class GuestsService {
    private readonly logger = new Logger(GuestsService.name);

    constructor(
        private dataSource: DataSource,
        @InjectRepository(Guest) private guestRepo: Repository<Guest>,
        @Inject(forwardRef(() => EventsService))
        private readonly eventsService: EventsService,
    ) {}

    async findOne(id: number): Promise<Guest> {
        const guest = await this.guestRepo.findOne({
            where: { id },
            relations: ['qrCode', 'qrCode.event'],
        });
        if (!guest) {
            throw new NotFoundException(`Guest with ID ${id} not found`);
        }
        return guest;
    }

    async createGuest(dto: CreateGuestDto, eventId: number): Promise<Guest> {
        let createdGuest: Guest;
        let numericId: number;
        let eventForQr: Event;

        await this.dataSource.transaction(async (manager) => {
            // 1. Create guest
            const guest = manager.create(Guest, {
                ...dto,
                eventId,
            });
            await manager.save(guest);

            // 2. Create QR code
            const event = await manager.findOne(Event, {
                where: { id: eventId },
            });
            if (!event || event.deletedAt) {
                throw new NotFoundException(
                    `Event with ID ${eventId} not found or is deleted`,
                );
            }
            eventForQr = event;

            numericId = await getNextNumericIdForEvent(eventId, manager);
            const qrCode = manager.create(QrCode, {
                guestId: guest.id,
                eventId,
                numericId,
                templateId: event.defaultTemplateId || null,
            });
            await manager.save(qrCode);

            // 3. Link and return
            guest.qrCode = qrCode;
            createdGuest = guest;
        });

        // Attach event to QR code so frontend can compute qrLink
        if (createdGuest.qrCode && eventForQr) {
            createdGuest.qrCode.event = eventForQr;
        }

        // T081: Record activity for guest addition (best-effort, outside transaction)
        try {
            await this.eventsService.createActivity(
                eventId,
                'guest_added',
                'Guest Added',
                `${dto.name} was added to the event`,
                undefined,
                'user-plus',
                createdGuest.id,
            );
        } catch (activityError) {
            this.logger.warn(
                'Failed to record guest add activity:',
                activityError,
            );
        }

        return createdGuest;
    }

    async batchCreate(
        dtos: CreateGuestDto[],
        eventId: number,
    ): Promise<Guest[]> {
        // Fetch event separately since transaction won't have relations
        const eventForQr = await this.guestRepo.manager.findOne(Event, {
            where: { id: eventId },
        });

        return this.dataSource.transaction(async (manager) => {
            if (!eventForQr) {
                throw new NotFoundException(
                    `Event with ID ${eventId} not found`,
                );
            }

            const results: Guest[] = [];
            let nextId = await getNextNumericIdForEvent(eventId, manager);

            for (const dto of dtos) {
                const guest = manager.create(Guest, {
                    ...dto,
                    eventId,
                });
                await manager.save(guest);

                const qrCode = manager.create(QrCode, {
                    guestId: guest.id,
                    eventId,
                    numericId: nextId++,
                    templateId: eventForQr.defaultTemplateId || null,
                });
                await manager.save(qrCode);
                guest.qrCode = qrCode;

                // Attach event so frontend can compute qrLink
                guest.qrCode.event = eventForQr;

                results.push(guest);
            }

            return results;
        });
    }

    async findAll(
        eventId: number,
        query: GuestQueryDto = new GuestQueryDto(),
    ): Promise<PaginatedResponseDto<Guest>> {
        const {
            page = 1,
            limit = 10,
            search,
            status,
            role,
            group,
            orderBy = 'createdAt:DESC',
            includeDeleted = false,
            includeDenied = false,
        } = query;

        const qb = this.guestRepo
            .createQueryBuilder('guest')
            .leftJoinAndSelect('guest.qrCode', 'qrCode')
            .leftJoinAndSelect('qrCode.event', 'event');

        if (includeDeleted) {
            qb.withDeleted();
        }

        qb.where('guest.eventId = :eventId', { eventId });

        // Exclude Denied guests by default unless explicitly included (T018)
        if (!includeDenied) {
            qb.andWhere('guest.status != :deniedStatus', {
                deniedStatus: 'Denied',
            });
        }

        if (status) {
            qb.andWhere('guest.status = :status', { status });
        }

        if (role) {
            qb.andWhere('guest.role = :role', { role });
        }

        if (group) {
            qb.andWhere('guest.group = :group', { group });
        }

        if (search) {
            const searchLower = `%${search.toLowerCase()}%`;
            qb.andWhere(
                '(LOWER(guest.name) LIKE :search OR LOWER(guest.email) LIKE :search OR LOWER(guest.phone) LIKE :search)',
                { search: searchLower },
            );
        }

        const [sortField, sortOrder] = orderBy.split(':');
        const validSortFields = [
            'createdAt',
            'updatedAt',
            'name',
            'status',
            'email',
            'role',
            'group',
        ];
        const field = validSortFields.includes(sortField)
            ? `guest.${sortField}`
            : 'guest.createdAt';
        const direction = sortOrder?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

        qb.orderBy(field, direction as 'ASC' | 'DESC');
        qb.skip((page - 1) * limit).take(limit);

        const [data, total] = await qb.getManyAndCount();

        // T018A: Count denied guests for the event to support contextual empty states
        const totalDenied = await this.guestRepo.count({
            where: { eventId, status: 'Denied' as any },
        });

        return PaginatedResponseDto.from(data, total, page, limit, totalDenied);
    }

    async softDeleteGuest(eventId: number, guestId: number): Promise<void> {
        await this.dataSource.transaction(async (manager) => {
            // 1. Deactivate the guest by setting status to Denied
            const guestResult = await manager.update(
                Guest,
                { id: guestId, eventId },
                { status: 'Denied' },
            );

            if (guestResult.affected === 0) {
                throw new NotFoundException(
                    `Guest with ID ${guestId} not found in event ${eventId}`,
                );
            }
        });
    }

    async updateGuest(
        eventId: number,
        guestId: number,
        dto: UpdateGuestDto,
    ): Promise<Guest> {
        const guest = await this.guestRepo.findOne({
            where: { id: guestId, eventId },
            relations: ['qrCode'],
        });
        if (!guest) {
            throw new NotFoundException(
                `Guest with ID ${guestId} not found in event ${eventId}`,
            );
        }

        const previousStatus = guest.status;

        // Handle templateId update on the QR code
        const { templateId, ...guestFields } = dto;
        Object.assign(guest, guestFields);

        // Log status transitions (T021)
        if (dto.status && dto.status !== previousStatus) {
            this.logger.log(
                `Guest status transition: ${guestId} [${previousStatus} -> ${dto.status}] in event ${eventId}`,
            );
        }

        const savedGuest = await this.guestRepo.save(guest);

        // Update QR code templateId if provided
        if (templateId !== undefined && guest.qrCode) {
            guest.qrCode.templateId = templateId;
            await this.dataSource.getRepository(QrCode).save(guest.qrCode);
        }

        // T084: Record activity for status change (best-effort)
        if (dto.status && dto.status !== previousStatus) {
            try {
                await this.eventsService.createActivity(
                    eventId,
                    'status_changed',
                    'Guest Status Changed',
                    `${savedGuest.name} status changed from ${previousStatus} to ${dto.status}`,
                    undefined,
                    'tag',
                    savedGuest.id,
                    { previousStatus, newStatus: dto.status },
                );
            } catch (activityError) {
                this.logger.warn(
                    'Failed to record status change activity:',
                    activityError,
                );
            }
        }

        return savedGuest;
    }

    async bulkUpdate(eventId: number, dto: BulkUpdateGuestsDto): Promise<void> {
        const { guestIds, ...updateFields } = dto;
        if (guestIds.length === 0 || Object.keys(updateFields).length === 0)
            return;

        await this.guestRepo.update(
            { id: In(guestIds), eventId },
            updateFields as any,
        );
    }

    async bulkSoftDelete(
        eventId: number,
        dto: BulkDeleteGuestsDto,
    ): Promise<void> {
        if (dto.guestIds.length === 0) return;

        await this.guestRepo.update(
            { id: In(dto.guestIds), eventId },
            { status: 'Denied' },
        );
    }

    async exportCsv(eventId: number, guestIds?: number[]): Promise<string> {
        const where: any = { eventId };
        if (guestIds && guestIds.length > 0) {
            where.id = In(guestIds);
        }
        const guests = await this.guestRepo.find({
            where,
            relations: ['qrCode', 'qrCode.event'],
            order: { createdAt: 'ASC' },
        });

        let csv = 'Name,Email,Phone,Role,Group,Status,QR Code Link\n';

        for (const g of guests) {
            const qrLink = g.qrCode
                ? generateQrLink(g.qrCode.event, g.qrCode.numericId)
                : '';
            const row = [
                `"${(g.name || '').replace(/"/g, '""')}"`,
                `"${(g.email || '').replace(/"/g, '""')}"`,
                `"${(g.phone || '').replace(/"/g, '""')}"`,
                `"${(g.role || '').replace(/"/g, '""')}"`,
                `"${(g.group || '').replace(/"/g, '""')}"`,
                `"${(g.status || '').replace(/"/g, '""')}"`,
                `"${qrLink.replace(/"/g, '""')}"`,
            ];
            csv += row.join(',') + '\n';
        }
        return csv;
    }

    async importCsv(
        eventId: number,
        csvData: string,
    ): Promise<{
        created: number;
        duplicates: number;
        skipped: number;
        errors: Array<{ row: number; reason: string }>;
    }> {
        const VALID_STATUSES = ['pending', 'complete', 'denied'];

        const lines = csvData
            .split('\n')
            .map((line) => line.trim())
            .filter((line) => line.length > 0);
        if (lines.length <= 1) {
            return { created: 0, duplicates: 0, skipped: 0, errors: [] };
        }

        const headers = lines[0]
            .split(',')
            .map((h) =>
                h.toLowerCase().trim().replace(/^"/, '').replace(/"$/, ''),
            );

        const idxName = headers.findIndex((h) => h.includes('name'));
        const idxEmail = headers.findIndex((h) => h.includes('email'));
        const idxPhone = headers.findIndex((h) => h.includes('phone'));
        const idxRole = headers.findIndex((h) => h.includes('role'));
        const idxGroup = headers.findIndex((h) => h.includes('group'));
        const idxStatus = headers.findIndex((h) => h.includes('status'));

        const dtos: CreateGuestDto[] = [];
        const errors: Array<{ row: number; reason: string }> = [];
        const existingGuests = await this.guestRepo.find({
            where: { eventId },
            select: ['email'],
        });
        const existingEmails = new Set(
            existingGuests.map((g) => g.email).filter((e) => e),
        );

        let duplicates = 0;
        let skipped = 0;

        for (let i = 1; i < lines.length; i++) {
            const rowNum = i + 1; // 1-indexed row number for user-facing errors
            const cols = lines[i]
                .split(',')
                .map((c) => c.replace(/^"/, '').replace(/"$/, '').trim());

            // T063A: Reject rows with missing required Name field
            const name = idxName >= 0 ? cols[idxName] : '';
            if (!name) {
                errors.push({
                    row: rowNum,
                    reason: 'Missing required field: Name',
                });
                skipped++;
                continue;
            }

            // T063A: Validate email format if provided
            const email = idxEmail >= 0 ? cols[idxEmail] : undefined;
            if (email) {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(email)) {
                    errors.push({
                        row: rowNum,
                        reason: `Invalid email format: "${email}"`,
                    });
                    skipped++;
                    continue;
                }
            }

            // T063A: Validate Status enum if provided
            const rawStatus = idxStatus >= 0 ? cols[idxStatus] : undefined;
            if (
                rawStatus &&
                !VALID_STATUSES.includes(rawStatus.toLowerCase())
            ) {
                errors.push({
                    row: rowNum,
                    reason: `Status value not in enum: "${rawStatus}" (allowed: ${VALID_STATUSES.join(', ')})`,
                });
                skipped++;
                continue;
            }

            // Skip duplicate emails
            if (email && existingEmails.has(email)) {
                duplicates++;
                continue;
            }

            if (email) existingEmails.add(email);

            dtos.push({
                name,
                email: email || undefined,
                phone:
                    idxPhone >= 0 && cols[idxPhone]
                        ? cols[idxPhone]
                        : undefined,
                role: idxRole >= 0 && cols[idxRole] ? cols[idxRole] : undefined,
                group:
                    idxGroup >= 0 && cols[idxGroup]
                        ? cols[idxGroup]
                        : undefined,
                status: rawStatus
                    ? ((rawStatus.charAt(0).toUpperCase() +
                          rawStatus.slice(1).toLowerCase()) as any)
                    : undefined,
            });
        }

        if (dtos.length > 0) {
            await this.batchCreate(dtos, eventId);
        }

        return { created: dtos.length, duplicates, skipped, errors };
    }
}
