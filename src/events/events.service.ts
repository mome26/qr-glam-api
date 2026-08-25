import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Not } from 'typeorm';
import { Event } from './entities/event.entity';
import { Guest } from '../guests/entities/guest.entity';
import { Media } from './entities/media.entity';
import { Activity } from './entities/activity.entity';
import { QrCode } from '../qr-codes/entities/qr-code.entity';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { CreateMediaDto } from './dto/create-media.dto';
import { UpdateMediaDto } from './dto/update-media.dto';
import { EventSettingsDto } from './dto/event-settings.dto';
import { EventQueryDto } from './dto/event-query.dto';
import { MediaQueryDto } from './dto/media-query.dto';
import { ActivityQueryDto } from './dto/activity-query.dto';
import { EventSettingsResponseDto } from './dto/event-settings-response.dto';
import { EventStatisticsDto } from './dto/event-statistics.dto';
import { GlobalStatisticsDto } from './dto/global-statistics.dto';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';
import { generateUuidV7Hash } from './utils/hash-generator.util';
import {
    ForbiddenException,
    BadRequestException,
    NotFoundException,
} from '@nestjs/common';
import { EventStatus } from './enums/event-status.enum';
import { UrlStrategy } from './enums/url-strategy.enum';
import { extractFolderId } from '../utils/extract-folder-id';

@Injectable()
export class EventsService {
    private readonly logger = new Logger(EventsService.name);

    constructor(
        @InjectRepository(Event)
        private eventsRepository: Repository<Event>,
        @InjectRepository(Media)
        private mediaRepository: Repository<Media>,
        @InjectRepository(Activity)
        private activitiesRepository: Repository<Activity>,
        private dataSource: DataSource,
        private configService: ConfigService,
    ) {}

    async create(
        createEventDto: CreateEventDto,
        ownerId: number,
    ): Promise<Event> {
        const event = this.eventsRepository.create({
            ...createEventDto,
            date: new Date(createEventDto.date),
            ownerId,
        });

        // Generate UUID v7 hash for ALL events on creation (immutable)
        // urlHash is now always a full UUID v7 format
        if (!event.urlHash || event.urlHash === '') {
            event.urlHash = generateUuidV7Hash();
        } else {
            // Validate provided UUID v7 format
            const uuidV7Pattern =
                /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
            if (!uuidV7Pattern.test(event.urlHash)) {
                throw new BadRequestException(
                    'urlHash must be a valid UUID v7 format',
                );
            }
            // Validate uniqueness of provided hash
            const existing = await this.eventsRepository.findOne({
                where: { urlHash: event.urlHash },
                withDeleted: true,
            });
            if (existing) {
                throw new BadRequestException(
                    'This URL hash is already in use',
                );
            }
        }

        // Auto-generate unique slug if not provided
        if (!event.slug) {
            let baseSlug = event.name
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-+|-+$/g, '');

            if (!baseSlug) baseSlug = 'event';

            let finalSlug = baseSlug;
            let counter = 1;
            while (
                await this.eventsRepository.findOne({
                    where: { slug: finalSlug },
                    withDeleted: true,
                })
            ) {
                finalSlug = `${baseSlug}-${counter++}`;
            }
            event.slug = finalSlug;
        } else {
            // Validate provided slug uniqueness
            const existing = await this.eventsRepository.findOne({
                where: { slug: event.slug },
                withDeleted: true,
            });
            if (existing) {
                throw new BadRequestException('This slug is already in use');
            }
        }

        return this.eventsRepository.save(event);
    }

    async findAll(
        userId: number,
        userRole: string,
        query: EventQueryDto,
    ): Promise<PaginatedResponseDto<Event>> {
        const {
            page = 1,
            limit = 10,
            search,
            status,
            orderBy = 'date:ASC',
        } = query;
        const skip = (page - 1) * limit;

        const qb = this.eventsRepository.createQueryBuilder('event');

        // ADMIN and STAFF can see all events
        // MEMBER can only see events in public states (UPCOMING, ONGOING, COMPLETED) AND with public visibility
        if (userRole !== 'ADMIN' && userRole !== 'STAFF') {
            qb.where('event.status IN (:...publicStatuses)', {
                publicStatuses: [
                    EventStatus.UPCOMING,
                    EventStatus.ONGOING,
                    EventStatus.COMPLETED,
                ],
            }).andWhere('event.visibility = :visibility', {
                visibility: 'public',
            });
        }

        if (search) {
            const searchCondition =
                '(LOWER(event.name) LIKE :search OR LOWER(event.description) LIKE :search OR LOWER(event.location) LIKE :search)';
            qb.andWhere(searchCondition, {
                search: `%${search.toLowerCase()}%`,
            });
        }

        if (status) {
            qb.andWhere('event.status = :status', { status });
        }

        if (query.dateRangeStart) {
            qb.andWhere('event.date >= :startDate', {
                startDate: new Date(query.dateRangeStart),
            });
        }

        if (query.dateRangeEnd) {
            qb.andWhere('event.date <= :endDate', {
                endDate: new Date(query.dateRangeEnd),
            });
        }

        if (orderBy) {
            const parts = orderBy.split(':');
            if (parts.length === 2) {
                const [sortField, sortOrder] = parts;
                const validFields = [
                    'createdAt',
                    'date',
                    'name',
                    'status',
                    'registeredAttendees',
                ];
                if (validFields.includes(sortField)) {
                    qb.orderBy(
                        `event.${sortField}`,
                        sortOrder.toUpperCase() as 'ASC' | 'DESC',
                    );
                }
            } else {
                qb.orderBy('event.date', 'ASC');
            }
        } else {
            qb.orderBy('event.date', 'ASC');
        }

        const [data, total] = await qb.skip(skip).take(limit).getManyAndCount();

        return PaginatedResponseDto.from(data, total, page, limit);
    }

    async findUpcoming(_userId: number, _userRole: string): Promise<Event[]> {
        const where: any = { status: EventStatus.UPCOMING };

        // ADMIN and STAFF see all upcoming events
        // MEMBER sees upcoming events (already filtered by status)
        return this.eventsRepository.find({
            where,
            order: {
                date: 'ASC',
            },
        });
    }

    async findOne(id: number): Promise<Event> {
        return this.eventsRepository.findOne({
            where: { id },
        });
    }

    async findByQrCodeId(qrCodeId: number): Promise<Event[]> {
        const event = await this.eventsRepository
            .createQueryBuilder('event')
            .innerJoin('event.qrCodes', 'qrCode')
            .where('qrCode.id = :qrCodeId', { qrCodeId })
            .getOne();
        return event ? [event] : [];
    }

    /**
     * Find an event by any valid identifier format:
     * 1. Numeric ID: /events/123
     * 2. 8-char Hash: /events/a1b2c3d4
     * 3. Slug-with-ID: /events/my-event-123
     * 4. Pure Slug: /events/my-event
     */
    async findByUrlHash(urlHash: string): Promise<Event> {
        const event = await this.eventsRepository.findOne({
            where: { urlHash },
            withDeleted: true,
        });
        if (!event) {
            throw new NotFoundException(
                `Event not found with urlHash: ${urlHash}`,
            );
        }
        return event;
    }

    async findByIdentifier(identifier: string): Promise<Event> {
        // 1. Numeric ID
        if (/^\d+$/.test(identifier)) {
            const id = parseInt(identifier, 10);
            const event = await this.eventsRepository.findOne({
                where: { id },
                withDeleted: true,
            });
            if (event) return event;
        }

        // 2. UUID v7 hash (xxxxxxxx-xxxx-7xxx-xxxx-xxxxxxxxxxxx)
        if (
            /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
                identifier,
            )
        ) {
            const event = await this.eventsRepository.findOne({
                where: { urlHash: identifier },
                withDeleted: true,
            });
            if (event) return event;
        }

        // 3. Slug-with-ID ({slug}-{id})
        const slugWithIdMatch = identifier.match(/^(.+)-(\d+)$/);
        if (slugWithIdMatch) {
            const slug = slugWithIdMatch[1];
            const id = parseInt(slugWithIdMatch[2], 10);
            const event = await this.eventsRepository.findOne({
                where: { id, slug },
                withDeleted: true,
            });
            if (event) return event;
        }

        // 4. Pure Slug
        const event = await this.eventsRepository.findOne({
            where: { slug: identifier },
            withDeleted: true,
        });
        if (event) return event;

        throw new NotFoundException(
            `Event not found with identifier: ${identifier}`,
        );
    }

    async update(
        id: number,
        updateEventDto: UpdateEventDto,
        userId: number,
        userRole: string,
    ): Promise<Event> {
        const event = await this.findOne(id);
        if (!event) return null;

        // Only ADMIN or STAFF can update events
        if (userRole !== 'ADMIN' && userRole !== 'STAFF') {
            throw new ForbiddenException(
                'You do not have permission to update this event',
            );
        }

        const updateData: any = { ...updateEventDto };
        if (updateEventDto.date) {
            updateData.date = new Date(updateEventDto.date);
        }
        await this.eventsRepository.update(id, updateData);
        return this.findOne(id);
    }

    async registerAttendee(id: number): Promise<Event> {
        const event = await this.findOne(id);
        if (event) {
            event.registeredAttendees = (event.registeredAttendees || 0) + 1;
            return this.eventsRepository.save(event);
        }
        return null;
    }

    async unregisterAttendee(id: number): Promise<Event> {
        const event = await this.findOne(id);
        if (event && event.registeredAttendees > 0) {
            event.registeredAttendees -= 1;
            return this.eventsRepository.save(event);
        }
        return null;
    }

    async remove(id: number, userId: number, userRole: string): Promise<void> {
        const event = await this.findOne(id);
        if (!event) return;

        // Only ADMIN or STAFF can delete events
        if (userRole !== 'ADMIN' && userRole !== 'STAFF') {
            throw new ForbiddenException(
                'You do not have permission to delete this event',
            );
        }

        await this.dataSource.transaction(async (manager) => {
            // 1. Soft-delete all guests associated with this event
            await manager.update(
                Guest,
                { eventId: id },
                { deletedAt: new Date() },
            );

            // 2. Soft-delete all QR codes associated with this event
            await manager.update(
                QrCode,
                { eventId: id },
                { deletedAt: new Date() },
            );

            // 3. Soft-delete all media associated with this event
            await manager.update(
                Media,
                { eventId: id },
                { deletedAt: new Date() },
            );

            // 4. Soft-delete all activities associated with this event
            await manager.update(
                Activity,
                { eventId: id },
                { deletedAt: new Date() },
            );

            // 5. Finally, soft-delete the event
            await manager.update(Event, id, { deletedAt: new Date() });
        });
    }

    /**
     * Build the public URL for an event based on its strategy
     */
    buildEventUrl(event: Event): string {
        const baseUrl = process.env.BASE_URL || 'http://localhost:3001';
        let path = '';

        switch (event.urlStrategy) {
            case UrlStrategy.HASH:
                path = `/e/${event.urlHash}`;
                break;
            case UrlStrategy.SLUG_WITH_ID:
                path = `/e/${event.slug}-${event.id}`;
                break;
            case UrlStrategy.NUMERIC:
                path = `/e/${event.id}`;
                break;
            case UrlStrategy.PURE_SLUG:
            default:
                path = `/e/${event.slug}`;
                break;
        }

        return `${baseUrl}${path}`;
    }

    /**
     * Build QR code URL with redirect logic.
     * Resolves any identifier to the event, then builds the QR URL based on current urlStrategy.
     * Returns both the target URL and whether a redirect is needed.
     */
    buildQrUrlWithRedirect(
        identifier: string,
        qrNumericId: number,
        event: Event,
        requestOrigin?: string,
    ): {
        targetUrl: string;
        needsRedirect: boolean;
        currentIdentifier: string;
    } {
        const baseUrl =
            requestOrigin || process.env.BASE_URL || 'http://localhost:3001';
        const baseUrlNoSlash = baseUrl.replace(/\/+$/, '');

        // Build the current URL based on event's urlStrategy
        let currentIdentifier = `${event.id}`;
        switch (event.urlStrategy) {
            case UrlStrategy.HASH:
                currentIdentifier = event.urlHash || `${event.id}`;
                break;
            case UrlStrategy.SLUG_WITH_ID:
                currentIdentifier = `${event.slug}-${event.id}`;
                break;
            case UrlStrategy.PURE_SLUG:
                currentIdentifier = event.slug || `${event.id}`;
                break;
            case UrlStrategy.NUMERIC:
            default:
                currentIdentifier = `${event.id}`;
                break;
        }

        const targetUrl = `${baseUrlNoSlash}/e/${currentIdentifier}/qr/${qrNumericId}`;
        const needsRedirect = identifier !== currentIdentifier;

        return { targetUrl, needsRedirect, currentIdentifier };
    }

    // Guest management migrated to GuestsService

    // Media Management
    async createMedia(createMediaDto: CreateMediaDto): Promise<Media> {
        const media = this.mediaRepository.create(createMediaDto);
        const savedMedia = await this.mediaRepository.save(media);

        // T082: Record activity for media upload (best-effort)
        try {
            await this.createActivity(
                createMediaDto.eventId,
                'photo_upload',
                'Media Uploaded',
                'Media uploaded for event',
            );
        } catch (activityError) {
            this.logger.warn(
                'Failed to record media upload activity:',
                activityError,
            );
        }

        return savedMedia;
    }

    async findMediaByEventId(
        eventId: number,
        query: MediaQueryDto,
    ): Promise<PaginatedResponseDto<Media>> {
        const { page = 1, limit = 10, search, type } = query;
        const skip = (page - 1) * limit;

        const qb = this.mediaRepository
            .createQueryBuilder('media')
            .where('media.eventId = :eventId', { eventId });

        if (type) {
            qb.andWhere('media.mediaType = :type', { type });
        }

        if (search) {
            qb.andWhere(
                '(LOWER(media.title) LIKE :search OR LOWER(media.phase) LIKE :search)',
                {
                    search: `%${search.toLowerCase()}%`,
                },
            );
        }

        const [data, total] = await qb
            .orderBy('media.createdAt', 'DESC')
            .skip(skip)
            .take(limit)
            .getManyAndCount();

        return PaginatedResponseDto.from(data, total, page, limit);
    }

    async findMedia(id: number): Promise<Media> {
        return this.mediaRepository.findOne({
            where: { id },
        });
    }

    async updateMedia(
        id: number,
        updateMediaDto: UpdateMediaDto,
    ): Promise<Media> {
        await this.mediaRepository.update(id, updateMediaDto);
        return this.findMedia(id);
    }

    async removeMedia(id: number): Promise<void> {
        await this.mediaRepository.delete(id);
    }

    // Activity Management
    async createActivity(
        eventId: number,
        type: string,
        title: string,
        description: string,
        performedBy?: string, // This likely remains string as it's a name or id
        icon?: string,
        relatedEntityId?: number,
        metadata?: any,
    ): Promise<Activity> {
        const activity = this.activitiesRepository.create({
            eventId,
            type,
            title,
            description,
            performedBy,
            icon,
            relatedEntityId,
            metadata: metadata ? JSON.stringify(metadata) : null,
        });

        // T083-limit: Enforce hard limit on activities per event (rolling buffer)
        try {
            const maxActivities = parseInt(
                this.configService.get<string>('MAX_EVENT_ACTIVITIES', '200'),
                10,
            );
            const count = await this.activitiesRepository.count({
                where: { eventId },
            });

            if (count >= maxActivities) {
                // Find oldest activity for this event
                const oldest = await this.activitiesRepository.findOne({
                    where: { eventId },
                    order: { createdAt: 'ASC' },
                });
                if (oldest) {
                    await this.activitiesRepository.delete(oldest.id);
                }
            }
        } catch (err) {
            this.logger.warn('Failed to enforce activity limit:', err);
        }

        return this.activitiesRepository.save(activity);
    }

    async findActivitiesByEventId(
        eventId: number,
        query: ActivityQueryDto,
    ): Promise<PaginatedResponseDto<Activity>> {
        const { page = 1, limit = 10 } = query;
        const skip = (page - 1) * limit;

        const [data, total] = await this.activitiesRepository.findAndCount({
            where: { eventId },
            order: { createdAt: 'DESC' },
            skip,
            take: limit,
        });

        return PaginatedResponseDto.from(data, total, page, limit);
    }

    async removeActivity(id: number): Promise<void> {
        await this.activitiesRepository.delete(id);
    }

    // Event Settings
    async getEventSettings(eventId: number): Promise<EventSettingsResponseDto> {
        const event = await this.findOne(eventId);
        if (!event) return null;

        return {
            eventId,
            eventStatus: event.status,
            eventVisibility: event.visibility || 'private',
            eventSlug: event.slug || '',
            mediaSourceUrl: event.mediaSourceUrl,
            mediaFolderId: event.mediaFolderId,
            urlStrategy: event.urlStrategy,
            urlHash: event.urlHash,
            requireAuthForQrScan: event.requireAuthForQrScan,
            scanPageTemplate: event.scanPageTemplate || null,
            scanPageTemplateId: event.scanPageTemplateId || null,
        };
    }

    async updateEventSettings(
        eventId: number,
        settingsDto: EventSettingsDto,
    ): Promise<EventSettingsResponseDto> {
        const event = await this.findOne(eventId);
        if (!event) return null;

        console.log(`Updating settings for event ${eventId}:`, settingsDto);

        if (settingsDto.eventStatus) {
            event.status = settingsDto.eventStatus;
        }
        if (settingsDto.eventVisibility) {
            event.visibility = settingsDto.eventVisibility;
        }

        if (settingsDto.requireAuthForQrScan !== undefined) {
            event.requireAuthForQrScan = settingsDto.requireAuthForQrScan;
        }

        // Handle URL Strategy change (urlHash remains immutable - never regenerated)
        if (
            settingsDto.urlStrategy &&
            settingsDto.urlStrategy !== event.urlStrategy
        ) {
            event.urlStrategy = settingsDto.urlStrategy;
            // Note: urlHash is NOT cleared or regenerated - it's immutable after creation
        }

        // T013/T021/T022: Slug logic with uniqueness check
        // urlHash cannot be manually changed - it's immutable after event creation
        if (settingsDto.eventSlug === '') {
            event.slug = null;
        } else if (settingsDto.eventSlug) {
            const targetSlug = settingsDto.eventSlug.toLowerCase();
            if (targetSlug !== event.slug) {
                const existing = await this.eventsRepository.findOne({
                    where: { slug: targetSlug },
                    withDeleted: true,
                });
                if (existing) {
                    throw new BadRequestException(
                        'This slug is already in use',
                    );
                }
                event.slug = targetSlug;
            }
        }

        if (!event.slug) {
            // Auto-generate if not provided AND not already set
            let baseSlug = event.name
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-+|-+$/g, '');

            if (!baseSlug) baseSlug = 'event';

            // Ensure auto-generated slug is also unique
            let finalSlug = baseSlug;
            let counter = 1;
            while (
                await this.eventsRepository.findOne({
                    where: { slug: finalSlug },
                    withDeleted: true,
                })
            ) {
                finalSlug = `${baseSlug}-${counter++}`;
            }
            event.slug = finalSlug;
        }

        if (settingsDto.scanPageTemplate !== undefined) {
            event.scanPageTemplate = settingsDto.scanPageTemplate;
            // If setting custom HTML, clear the named template ID
            if (settingsDto.scanPageTemplate !== null) {
                event.scanPageTemplateId = null;
            }
        }

        if (settingsDto.scanPageTemplateId !== undefined) {
            event.scanPageTemplateId = settingsDto.scanPageTemplateId;
            // If selecting a named template, clear the custom HTML
            if (settingsDto.scanPageTemplateId !== null) {
                event.scanPageTemplate = null;
            }
        }

        if (settingsDto.mediaSourceUrl !== undefined) {
            event.mediaSourceUrl = settingsDto.mediaSourceUrl;

            if (settingsDto.mediaSourceUrl) {
                event.mediaFolderId = extractFolderId(
                    settingsDto.mediaSourceUrl,
                );
            } else {
                event.mediaFolderId = null;
            }
        }

        const savedEvent = await this.eventsRepository.save(event);

        console.log(`Successfully updated settings for event ${eventId}`);

        return {
            eventId,
            eventStatus: savedEvent.status,
            eventVisibility: savedEvent.visibility,
            eventSlug: savedEvent.slug,
            mediaSourceUrl: savedEvent.mediaSourceUrl,
            mediaFolderId: savedEvent.mediaFolderId,
            urlStrategy: savedEvent.urlStrategy,
            urlHash: savedEvent.urlHash,
            requireAuthForQrScan: savedEvent.requireAuthForQrScan,
            scanPageTemplate: savedEvent.scanPageTemplate || null,
            scanPageTemplateId: savedEvent.scanPageTemplateId || null,
        };
    }

    // Event Statistics
    async getEventStatistics(eventId: number): Promise<EventStatisticsDto> {
        const event = await this.findOne(eventId);
        if (!event) return null;

        // Total Guests: all guests for this event
        const guests = await this.dataSource.manager.count(Guest, {
            where: { eventId },
        });

        // Active QR Codes = guests whose QR codes are still valid (not Denied)
        const deniedCount = await this.dataSource.manager.count(Guest, {
            where: { eventId, status: 'Denied' },
        });

        // Media Delivered = guests who have actually received their media
        const mediaDelivered = await this.dataSource.manager.count(Guest, {
            where: { eventId, status: 'Complete' },
        });

        return {
            eventId,
            totalGuests: guests,
            totalMedia: mediaDelivered,
            activeQrCodes: guests - deniedCount,
            registeredAttendees: event.registeredAttendees || 0,
        };
    }

    async getGlobalStatistics(): Promise<GlobalStatisticsDto> {
        // Total events count
        const totalEvents = await this.eventsRepository.count();

        // Active events (ongoing or upcoming)
        const activeEvents = await this.eventsRepository.count({
            where: [
                { status: EventStatus.ONGOING },
                { status: EventStatus.UPCOMING },
            ],
        });

        // Total QR codes count
        const totalQrCodes = await this.dataSource.manager.count(QrCode);

        // Total guests count (all non-deleted)
        const totalGuests = await this.dataSource.manager.count(Guest);

        // Media delivered (guests with status Complete)
        const mediaDelivered = await this.dataSource.manager.count(Guest, {
            where: { status: 'Complete' },
        });

        return {
            totalEvents,
            activeEvents,
            totalQrCodes,
            totalGuests,
            mediaDelivered,
        };
    }

    /**
     * Backfill urlHash for legacy events that don't have one.
     * Admin-only operation, idempotent.
     */
    async backfillUrlHashes(): Promise<{ updated: number }> {
        const eventsWithoutHash = await this.eventsRepository.find({
            where: { urlHash: null },
            withDeleted: true,
        });

        let updated = 0;
        for (const event of eventsWithoutHash) {
            event.urlHash = generateUuidV7Hash();
            await this.eventsRepository.save(event);
            updated++;
        }

        return { updated };
    }

    // Redirect logic and other event-related methods...
}
