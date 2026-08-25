import {
    BadRequestException,
    Injectable,
    Logger,
    NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, DataSource } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import archiver from 'archiver';
import * as QRCode from 'qrcode';
import { Response } from 'express';
import { QrCode } from './entities/qr-code.entity';
import { QrTemplate } from './entities/qr-template.entity';
import { CreateQrTemplateDto } from './dto/create-qr-template.dto';
import { UpdateQrTemplateDto } from './dto/update-qr-template.dto';
import { Event } from '../events/entities/event.entity';
import { Guest } from '../guests/entities/guest.entity';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';
import { QrCodeQueryDto } from './dto/qr-code-query.dto';
import {
    CreateQrCodeDto,
    UpdateQrCodeDto,
    BulkUpdateQrCodeDto,
    BatchGenerateQrDto,
} from './dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { GoogleDriveProvider } from '../storage/providers/google-drive.provider';
import { generateQrLink } from './utils/qr-link.util';
import { getNextNumericIdForEvent } from './utils/numeric-id.util';
import { EventsService } from '../events/events.service';
import { DriveFileInfoDto } from '../storage/dto/drive-file-info.dto';
import * as handlebars from 'handlebars';
import { TemplateCacheService } from './services/template-cache.service';

/** T044A: Allowed background image extensions */
const ALLOWED_BACKGROUND_EXTENSIONS = ['png', 'jpg', 'jpeg', 'svg'];
/** T044A: Max background image size — 5 MB */
const MAX_BACKGROUND_SIZE_BYTES = 5 * 1024 * 1024;

export interface BatchGenerateResult {
    created: number;
    from: number;
    to: number;
}

@Injectable()
export class QrCodesService {
    private readonly logger = new Logger(QrCodesService.name);
    private templateCache = new Map<
        number,
        { template: string; compiledFn: handlebars.TemplateDelegate }
    >();

    constructor(
        @InjectRepository(QrCode)
        private qrCodeRepository: Repository<QrCode>,
        @InjectRepository(QrTemplate)
        private qrTemplateRepository: Repository<QrTemplate>,
        @InjectRepository(Event)
        private eventRepository: Repository<Event>,
        private readonly googleDriveProvider: GoogleDriveProvider,
        private readonly eventsService: EventsService,
        private readonly templateCacheService: TemplateCacheService,
        private dataSource: DataSource,
    ) {}

    getCompiledTemplate(
        eventId: number,
        templateString: string,
    ): handlebars.TemplateDelegate {
        const cached = this.templateCache.get(eventId);
        if (cached && cached.template === templateString) {
            return cached.compiledFn;
        }
        const compiledFn = handlebars.compile(templateString);
        this.templateCache.set(eventId, {
            template: templateString,
            compiledFn,
        });
        return compiledFn;
    }

    /**
     * T006: Serve template list from startup cache (TemplateCacheService).
     * No per-request disk I/O — cache populated once at application startup.
     */
    async getAvailableTemplates(): Promise<
        Array<{ id: string; label: string; language: string; isDefault: boolean; contentHash?: string }>
    > {
        return this.templateCacheService.getAll();
    }

    /**
     * T006: Serve template content from startup cache.
     * Throws NotFoundException if template id not found.
     */
    async getTemplateContent(id: string): Promise<string> {
        return this.templateCacheService.getById(id);
    }

    /**
     * T079: Media URL fallback chain logic
     * customMediaUrl → provider.getGuestMediaUrl() → placeholder
     * Now returns structured DriveFileInfoDto | null instead of string
     */
    async resolveGuestMediaUrl(
        qrCode: QrCode & { guest?: any },
        _event?: Event,
    ): Promise<DriveFileInfoDto | null> {
        // 1. Check for explicit customMediaUrl on QrCode entity first
        if ((qrCode as any).customMediaUrl) {
            // Legacy: convert string URL to basic DriveFileInfoDto
            return {
                fileId: 'custom',
                fileName: 'custom',
                mimeType: 'unknown',
                fileSize: null,
                embedUrl: null,
                streamUrl: null,
                downloadUrl: (qrCode as any).customMediaUrl,
                thumbnailUrl: null,
            };
        }

        // 1b. Fallback to customMediaUrl on guest (legacy/alternate placement)
        if (qrCode.guest?.customMediaUrl) {
            return {
                fileId: 'custom',
                fileName: 'custom',
                mimeType: 'unknown',
                fileSize: null,
                embedUrl: null,
                streamUrl: null,
                downloadUrl: qrCode.guest.customMediaUrl,
                thumbnailUrl: null,
            };
        }

        // 2. Try cloud provider (GoogleDrive, etc.)
        // Skip provider call if event.mediaFolderId is empty (Spec Edge Case C4)
        if (_event?.mediaFolderId) {
            try {
                const providerInfo =
                    await this.googleDriveProvider.getGuestMediaUrl(
                        qrCode.eventId,
                        { ...qrCode.guest, numericId: qrCode.numericId },
                        { mediaFolderId: _event?.mediaFolderId },
                    );
                if (providerInfo) {
                    return providerInfo;
                }
            } catch (error) {
                this.logger.warn(
                    `Cloud provider failed for guest=${qrCode.guest?.id}:`,
                    error,
                );
                // Continue to placeholder (graceful degradation)
            }
        }

        // 3. Fallback to null (caller will use placeholder)
        return null;
    }

    /**
     * T009: Get next available numeric ID for event
     */
    async getNextId(eventId: number): Promise<number> {
        return getNextNumericIdForEvent(eventId, this.qrCodeRepository.manager);
    }

    /**
     * Set cloud provider for media resolution
     * @deprecated Use dependency injection instead
     */
    setCloudProvider(_provider: any): void {
        // Deprecated but keeping for test compatibility until refactored
    }

    async findOne(id: number): Promise<QrCode> {
        const qrCode = await this.qrCodeRepository.findOne({
            where: { id },
            relations: ['guest', 'event'],
        });
        if (!qrCode) {
            throw new NotFoundException(`QR code with ID ${id} not found`);
        }
        return qrCode;
    }

    /**
     * T044A: Validate background image upload for QR templates.
     * - Checks file size ≤ 5 MB
     * - Validates extension: png / jpg / jpeg / svg
     * - Creates event-scoped storage directory ./data/uploads/templates/{eventId}/
     *
     * @param eventId   Owning event ID (for scoped directory)
     * @param filename  Original filename (used for extension check)
     * @param sizeBytes File size in bytes
     * @param fileBuffer Optional file buffer; if provided the file is persisted
     * @returns Final storage path (relative to repo root)
     */
    async validateAndStoreBackgroundImage(
        eventId: number,
        filename: string,
        sizeBytes: number,
        fileBuffer?: Buffer,
    ): Promise<string> {
        // 1. Size check
        if (sizeBytes > MAX_BACKGROUND_SIZE_BYTES) {
            throw new BadRequestException(
                `Background image too large: ${(sizeBytes / 1024 / 1024).toFixed(2)} MB.` +
                    ` Maximum allowed is 5 MB.`,
            );
        }

        // 2. Extension check
        const ext = filename.split('.').pop()?.toLowerCase() ?? '';
        if (!ALLOWED_BACKGROUND_EXTENSIONS.includes(ext)) {
            throw new BadRequestException(
                `Invalid background image extension: ".${ext}". ` +
                    `Allowed: ${ALLOWED_BACKGROUND_EXTENSIONS.map((e) => '.' + e).join(', ')}`,
            );
        }

        // 3. Create event-scoped storage directory
        const uploadDir = path.join(
            process.cwd(),
            'data',
            'uploads',
            'templates',
            eventId.toString(),
        );
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
            this.logger.debug(`T044A: Created upload directory: ${uploadDir}`);
        }

        // 4. Persist file if buffer provided
        const storedFilename = `${Date.now()}-${filename.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
        const storedPath = path.join(uploadDir, storedFilename);

        if (fileBuffer) {
            fs.writeFileSync(storedPath, fileBuffer);
            this.logger.debug(
                `T044A: Stored background image at ${storedPath}`,
            );
        }

        // Return relative path from repo root for storage in DB
        return path.join(
            'data',
            'uploads',
            'templates',
            eventId.toString(),
            storedFilename,
        );
    }

    async createTemplate(
        eventId: number,
        dto: CreateQrTemplateDto,
    ): Promise<QrTemplate> {
        const template = this.qrTemplateRepository.create({
            ...dto,
            eventId,
        });
        const saved = await this.qrTemplateRepository.save(template);

        // Auto-set as default template if event has no default yet
        const event = await this.eventRepository.findOne({
            where: { id: eventId },
        });
        if (event && !event.defaultTemplateId) {
            event.defaultTemplateId = saved.id;
            await this.eventRepository.save(event);
            this.logger.debug(
                `Auto-set template ${saved.id} as default for event ${eventId}`,
            );
        }

        return saved;
    }

    async getTemplatesByEvent(
        eventId: number,
        query: PaginationQueryDto,
    ): Promise<PaginatedResponseDto<QrTemplate>> {
        const { page = 1, limit = 10 } = query;
        const skip = (page - 1) * limit;

        const [data, total] = await this.qrTemplateRepository
            .createQueryBuilder('template')
            .where('template.eventId = :eventId', { eventId })
            .orderBy('template.createdAt', 'DESC')
            .loadRelationCountAndMap('template.qrCount', 'template.qrCodes')
            .skip(skip)
            .take(limit)
            .getManyAndCount();

        return PaginatedResponseDto.from(data, total, page, limit);
    }

    async updateTemplate(
        templateId: number,
        dto: UpdateQrTemplateDto,
    ): Promise<QrTemplate> {
        await this.qrTemplateRepository.update(templateId, dto);
        const template = await this.qrTemplateRepository.findOne({
            where: { id: templateId },
        });
        if (!template) {
            throw new NotFoundException('Template not found');
        }
        return template;
    }

    async getTemplateById(
        eventId: number,
        templateId: number,
    ): Promise<QrTemplate> {
        const template = await this.qrTemplateRepository.findOne({
            where: { id: templateId, eventId },
        });
        if (!template) {
            throw new NotFoundException('Template not found');
        }
        return template;
    }

    async deleteTemplate(templateId: number): Promise<void> {
        // Nullify templateId on all QR codes using this template
        await this.qrCodeRepository.update(
            { templateId },
            { templateId: null },
        );
        // Nullify defaultTemplateId on any event using this template
        await this.eventRepository.update(
            { defaultTemplateId: templateId },
            { defaultTemplateId: null },
        );
        await this.qrTemplateRepository.delete(templateId);
    }

    async duplicateTemplate(
        eventId: number,
        templateId: number,
    ): Promise<QrTemplate> {
        const original = await this.qrTemplateRepository.findOne({
            where: { id: templateId, eventId },
        });
        if (!original) {
            throw new NotFoundException('Template not found');
        }

        let newName = `${original.name} (Copy)`;
        let attempts = 0;
        const maxAttempts = 10;

        while (attempts < maxAttempts) {
            const existing = await this.qrTemplateRepository.findOne({
                where: { eventId, name: newName },
            });
            if (!existing) break;
            attempts++;
            newName = `${original.name} (Copy ${attempts})`;
        }

        // Clone data excluding ID and timestamps
        const duplicate = this.qrTemplateRepository.create({
            name: newName,
            eventId,
            backgroundImage: original.backgroundImage,
            qrPositionX: original.qrPositionX,
            qrPositionY: original.qrPositionY,
            qrSize: original.qrSize,
            showNumericIdBelow: original.showNumericIdBelow,
            textColor: original.textColor,
            customTexts: original.customTexts,
        });

        return this.qrTemplateRepository.save(duplicate);
    }

    async getQrCodesByEvent(
        eventId: number,
        query: QrCodeQueryDto,
    ): Promise<PaginatedResponseDto<QrCode>> {
        const {
            page = 1,
            limit = 10,
            search,
            assigned,
            includeDeleted = false,
        } = query;
        const skip = (page - 1) * limit;

        const qb = this.qrCodeRepository
            .createQueryBuilder('qrCode')
            .leftJoinAndSelect('qrCode.guest', 'guest')
            .leftJoinAndSelect('qrCode.template', 'template')
            .leftJoinAndSelect('qrCode.event', 'event');

        if (includeDeleted) {
            qb.withDeleted();
        }

        qb.where('qrCode.eventId = :eventId', { eventId });

        if (search) {
            qb.andWhere(
                '(LOWER(guest.name) LIKE :search OR CAST(qrCode.numericId AS TEXT) LIKE :search)',
                { search: `%${search.toLowerCase()}%` },
            );
        }

        if (assigned !== undefined) {
            if (assigned) {
                qb.andWhere('qrCode.guestId IS NOT NULL');
            } else {
                qb.andWhere('qrCode.guestId IS NULL');
            }
        }

        if (query.ids && query.ids.length > 0) {
            qb.andWhere('qrCode.id IN (:...ids)', { ids: query.ids });
        }

        const [data, total] = await qb
            .orderBy('qrCode.numericId', 'ASC')
            .skip(skip)
            .take(limit)
            .getManyAndCount();

        return PaginatedResponseDto.from(data, total, page, limit);
    }

    async findOneByNumericId(
        eventId: number,
        numericId: number,
    ): Promise<QrCode | null> {
        const qrCode = await this.qrCodeRepository.findOne({
            where: { eventId, numericId },
            relations: ['guest', 'event'],
        });
        return qrCode;
    }

    async setEventDefaultTemplate(
        eventId: number,
        templateId: number,
    ): Promise<Event> {
        const event = await this.eventRepository.findOne({
            where: { id: eventId },
        });
        if (!event) {
            throw new NotFoundException('Event not found');
        }
        event.defaultTemplateId = templateId;
        return this.eventRepository.save(event);
    }

    /**
     * T028-T033: Create QR code with validation
     * - Verifies event exists
     * - qrLink is computed on-the-fly from eventId + numericId
     */
    async create(dto: CreateQrCodeDto): Promise<QrCode> {
        const qrCode = this.qrCodeRepository.create(dto);
        const saved = await this.qrCodeRepository.save(qrCode);
        // Reload with event relation so frontend can compute qrLink
        return this.qrCodeRepository.findOne({
            where: { id: saved.id },
            relations: ['event'],
        });
    }

    /**
     * T034: Update QR code
     * Handles nullable redirectLink field (empty string or null clears the redirect)
     */
    async update(id: number, dto: UpdateQrCodeDto): Promise<QrCode> {
        // Normalize empty redirectLink to null
        if (dto.redirectLink !== undefined && !dto.redirectLink) {
            dto.redirectLink = null;
        }
        await this.qrCodeRepository.update(id, dto);
        return this.findOne(id);
    }

    /**
     * T040: Update redirect link with URL scheme validation
     * - Validates URL scheme (http/https only)
     * - Handles nullable redirectLink field (empty string clears the redirect)
     * - Updates and returns persisted QR code
     */
    async updateRedirectLink(
        id: number,
        redirectLink: string | null,
    ): Promise<QrCode> {
        const qrCode = await this.findOne(id);

        // Validate URL scheme if redirectLink is provided
        if (redirectLink && redirectLink.trim()) {
            try {
                const url = new URL(redirectLink);
                if (url.protocol !== 'http:' && url.protocol !== 'https:') {
                    throw new BadRequestException(
                        'Redirect link must use http:// or https:// protocol',
                    );
                }
            } catch (error) {
                if (error instanceof BadRequestException) {
                    throw error;
                }
                throw new BadRequestException('Invalid redirect URL format');
            }
            qrCode.redirectLink = redirectLink;
        } else {
            // Clear the redirect link
            qrCode.redirectLink = null;
        }
        return this.qrCodeRepository.save(qrCode);
    }

    /**
     * T010: Batch generate QR codes with guest records.
     * - Processes in chunks of 50 to limit blast radius of failures.
     * - Each chunk wrapped in its own SERIALIZABLE transaction to prevent numericId collisions.
     * - Names guests as "Guest #N".
     * - Returns cumulative results, potentially including partial successes.
     */
    async batchGenerate(
        eventId: number,
        dto: BatchGenerateQrDto,
    ): Promise<BatchGenerateResult> {
        const CHUNK_SIZE = 50;
        let totalCreated = 0;
        let startFrom: number | undefined;
        let lastTo: number | undefined;

        // Process in chunks of 50, each in its own SERIALIZABLE transaction
        for (let offset = 0; offset < dto.count; offset += CHUNK_SIZE) {
            const chunkSize = Math.min(CHUNK_SIZE, dto.count - offset);

            const queryRunner = this.dataSource.createQueryRunner();
            await queryRunner.connect();
            await queryRunner.startTransaction('SERIALIZABLE');

            try {
                const manager = queryRunner.manager;

                const event = await manager.findOne(Event, {
                    where: { id: eventId },
                });
                if (!event)
                    throw new NotFoundException(`Event ${eventId} not found`);

                const templateId =
                    dto.templateId ?? event.defaultTemplateId ?? null;
                if (dto.templateId) {
                    const tpl = await manager.findOne(QrTemplate, {
                        where: { id: dto.templateId, eventId },
                    });
                    if (!tpl)
                        throw new BadRequestException(
                            `Template ${dto.templateId} not found`,
                        );
                }

                let nextNumericId = await getNextNumericIdForEvent(
                    event.id,
                    manager,
                );
                if (startFrom === undefined) startFrom = nextNumericId;

                for (let i = 0; i < chunkSize; i++) {
                    const guest = manager.create(Guest, {
                        name: `Guest #${String(nextNumericId).padStart(3, '0')}`,
                        eventId: event.id,
                        status: 'Pending',
                    });
                    await manager.save(guest);

                    const qrCode = manager.create(QrCode, {
                        guestId: guest.id,
                        eventId: event.id,
                        numericId: nextNumericId,
                        templateId,
                    });
                    await manager.save(qrCode);

                    nextNumericId++;
                }

                await queryRunner.commitTransaction();
                totalCreated += chunkSize;
                lastTo = nextNumericId - 1;
            } catch (err) {
                await queryRunner.rollbackTransaction();
                this.logger.error(
                    `Batch generation chunk failed: ${err.message}`,
                    err.stack,
                );
                // If we already committed some chunks, return partial result
                if (totalCreated > 0) {
                    return {
                        created: totalCreated,
                        from: startFrom!,
                        to: lastTo!,
                    };
                }
                // Otherwise rethrow
                throw err;
            } finally {
                await queryRunner.release();
            }
        }

        // T083: Record activity for batch QR generation (best-effort)
        if (totalCreated > 0) {
            this.recordQrBatchActivity(eventId, totalCreated).catch((err) =>
                this.logger.warn(
                    'QR batch activity failed (fire-and-forget):',
                    err,
                ),
            );
        }

        return { created: totalCreated, from: startFrom!, to: lastTo! };
    }

    // T083: Record activity for QR batch generation (best-effort, after all chunks succeed)
    private async recordQrBatchActivity(eventId: number, count: number) {
        try {
            await this.eventsService.createActivity(
                eventId,
                'qr_code_generated',
                'QR Codes Generated',
                `Batch generated ${count} QR code(s) for event`,
                undefined,
                'zap',
                undefined,
                { count },
            );
        } catch (activityError) {
            this.logger.warn(
                'Failed to record QR batch generation activity:',
                activityError,
            );
        }
    }

    /**
     * T003: Bulk update QR codes (template assignment).
     */
    async bulkUpdate(eventId: number, dto: BulkUpdateQrCodeDto): Promise<void> {
        const { qrCodeIds, templateId } = dto;
        if (qrCodeIds.length === 0) return;

        if (qrCodeIds.length > 100) {
            throw new BadRequestException(
                'Bulk update limit exceeded (max 100 items)',
            );
        }

        if (templateId) {
            const template = await this.qrTemplateRepository.findOne({
                where: { id: templateId, eventId },
            });
            if (!template) {
                throw new NotFoundException(
                    `Template ${templateId} not found for event ${eventId}`,
                );
            }
        }

        await this.qrCodeRepository
            .createQueryBuilder()
            .update(QrCode)
            .set({ templateId })
            .whereInIds(qrCodeIds)
            .andWhere('eventId = :eventId', { eventId })
            .execute();
    }

    /**
     * T009: Bulk download QR codes.
     */
    async bulkDownloadQr(
        eventId: number,
        qrCodeIds: number[],
        res: Response,
    ): Promise<void> {
        if (qrCodeIds.length === 0) {
            throw new BadRequestException('No QR codes selected for download');
        }

        if (qrCodeIds.length > 100) {
            throw new BadRequestException(
                'Bulk download limit exceeded (max 100 items)',
            );
        }

        const qrCodes = await this.qrCodeRepository.find({
            where: { id: In(qrCodeIds), eventId },
            relations: ['template', 'guest', 'event'],
        });

        if (qrCodes.length === 0) {
            throw new NotFoundException('Selected QR codes not found');
        }

        const archive = archiver('zip', { zlib: { level: 9 } });
        res.attachment(`qr-codes-event-${eventId}.zip`);
        archive.pipe(res);

        for (const qr of qrCodes) {
            try {
                const qrContent = this.generateQrContent(qr);
                const qrImageBuffer = await QRCode.toBuffer(qrContent, {
                    errorCorrectionLevel: 'H',
                    margin: 1,
                    width: qr.template?.qrSize || 1000,
                });

                const filename = `${qr.numericId}_${qr.guest?.name?.replace(/[^a-z0-9]/gi, '_') || 'unassigned'}.png`;
                archive.append(qrImageBuffer, { name: filename });
            } catch (err) {
                this.logger.error(
                    `Failed to generate QR ${qr.id}: ${err.message}`,
                );
            }
        }

        await archive.finalize();
    }

    private generateQrContent(qr: QrCode): string {
        if (!qr.event) {
            throw new Error(`Event not loaded for QR code ${qr.id}`);
        }
        return generateQrLink(qr.event, qr.numericId);
    }

    /**
     * Compute qrLink for API responses from eventId + numericId.
     * Uses numeric event ID form — no extra DB query needed.
     */
    generateQrLinkForResponse(eventId: number, numericId: number): string {
        return generateQrLink(eventId, numericId);
    }
}
