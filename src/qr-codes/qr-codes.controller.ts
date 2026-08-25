import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    Query,
    NotFoundException,
    Res,
    Req,
    Logger,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiParam,
    ApiResponse,
    ApiBody,
} from '@nestjs/swagger';
import { Response } from 'express';
import { QrCodesService } from './qr-codes.service';
import { EventsService } from '../events/events.service';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';
import {
    CreateQrTemplateDto,
    UpdateQrTemplateDto,
    UpdateQrCodeDto,
    QrCodeQueryDto,
    UpdateRedirectLinkDto,
    BulkUpdateQrCodeDto,
    BatchGenerateQrDto,
    ScanPagePreviewDto,
} from './dto';
import * as handlebars from 'handlebars';
import { InjectRepository } from '@nestjs/typeorm';
import { QrCode } from './entities/qr-code.entity';
import { Event } from '../events/entities/event.entity';
import { UrlStrategy } from '../events/enums/url-strategy.enum';
import { Guest } from '../guests/entities/guest.entity';
import { Repository } from 'typeorm';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { AdminStaffGuard } from '../auth/guards/admin-staff.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt.guard';
import { Public } from '../auth/decorators/public.decorator';
import { UseGuards } from '@nestjs/common';

@ApiTags('QR Codes')
@Controller()
@UseGuards(OptionalJwtAuthGuard)
export class QrCodesController {
    private readonly logger = new Logger(QrCodesController.name);

    constructor(
        private readonly qrCodesService: QrCodesService,
        private readonly eventsService: EventsService,
        @InjectRepository(QrCode) private qrCodeRepo: Repository<QrCode>,
        @InjectRepository(Event) private eventRepo: Repository<Event>,
        @InjectRepository(Guest) private guestRepo: Repository<Guest>,
    ) {}

    // Template CRUD Endpoints
    @Post('events/:eventId/templates')
    @UseGuards(AdminStaffGuard)
    @ApiTags('QR Templates')
    @ApiOperation({ summary: 'Create a new template - Admin/Staff only' })
    @ApiParam({
        name: 'eventId',
        description: 'Event ID, slug, or UUID v7 hash',
        type: 'string',
    })
    async createTemplate(
        @Param('eventId') eventId: string,
        @Body() dto: CreateQrTemplateDto,
    ) {
        const event = await this.eventsService.findByIdentifier(eventId);
        return this.qrCodesService.createTemplate(event.id, dto);
    }

    @Get('events/:eventId/templates')
    @ApiTags('QR Templates')
    @ApiOperation({ summary: 'Get templates for an event' })
    @ApiParam({
        name: 'eventId',
        description: 'Event ID, slug, or UUID v7 hash',
        type: 'string',
    })
    @ApiResponse({ status: 200, type: PaginatedResponseDto })
    async getTemplates(
        @Param('eventId') eventId: string,
        @Query() query: PaginationQueryDto,
    ) {
        const event = await this.eventsService.findByIdentifier(eventId);
        return this.qrCodesService.getTemplatesByEvent(event.id, query);
    }

    @Get('events/:eventId/templates/:templateId')
    @ApiTags('QR Templates')
    @ApiOperation({ summary: 'Get a single template by ID' })
    @ApiParam({
        name: 'eventId',
        description: 'Event ID, slug, or UUID v7 hash',
        type: 'string',
    })
    @ApiParam({ name: 'templateId', type: 'integer' })
    async getTemplate(
        @Param('eventId') eventId: string,
        @Param('templateId') templateId: number,
    ) {
        const event = await this.eventsService.findByIdentifier(eventId);
        return this.qrCodesService.getTemplateById(event.id, templateId);
    }

    @Patch('events/:eventId/templates/:templateId')
    @UseGuards(AdminStaffGuard)
    @ApiTags('QR Templates')
    @ApiOperation({ summary: 'Update a template - Admin/Staff only' })
    @ApiParam({
        name: 'eventId',
        description: 'Event ID, slug, or UUID v7 hash',
        type: 'string',
    })
    @ApiParam({ name: 'templateId', type: 'integer' })
    async updateTemplate(
        @Param('eventId') eventId: string,
        @Param('templateId') templateId: number,
        @Body() dto: UpdateQrTemplateDto,
    ) {
        return this.qrCodesService.updateTemplate(templateId, dto);
    }

    @Delete('events/:eventId/templates/:templateId')
    @UseGuards(AdminStaffGuard)
    @ApiTags('QR Templates')
    @ApiOperation({ summary: 'Delete a template - Admin/Staff only' })
    @ApiParam({
        name: 'eventId',
        description: 'Event ID, slug, or UUID v7 hash',
        type: 'string',
    })
    @ApiParam({ name: 'templateId', type: 'integer' })
    async deleteTemplate(
        @Param('eventId') eventId: string,
        @Param('templateId') templateId: number,
    ) {
        return this.qrCodesService.deleteTemplate(templateId);
    }

    @Post('events/:eventId/templates/:templateId/duplicate')
    @UseGuards(AdminStaffGuard)
    @ApiTags('QR Templates')
    @ApiOperation({ summary: 'Duplicate a template - Admin/Staff only' })
    @ApiParam({
        name: 'eventId',
        description: 'Event ID, slug, or UUID v7 hash',
        type: 'string',
    })
    @ApiParam({ name: 'templateId', type: 'integer' })
    async duplicateTemplate(
        @Param('eventId') eventId: string,
        @Param('templateId') templateId: number,
    ) {
        const event = await this.eventsService.findByIdentifier(eventId);
        return this.qrCodesService.duplicateTemplate(event.id, templateId);
    }

    @Patch('events/:eventId/default-template')
    @UseGuards(AdminStaffGuard)
    @ApiOperation({ summary: 'Set event default template - Admin/Staff only' })
    @ApiParam({
        name: 'eventId',
        description: 'Event ID, slug, or UUID v7 hash',
        type: 'string',
    })
    async setDefaultTemplate(
        @Param('eventId') eventId: string,
        @Body('templateId') templateId: number,
    ) {
        const event = await this.eventsService.findByIdentifier(eventId);
        return this.qrCodesService.setEventDefaultTemplate(
            event.id,
            templateId,
        );
    }

    @Get('events/:eventId/qr-codes/next-id')
    @ApiOperation({ summary: 'Get next available numeric ID for QR codes' })
    @ApiParam({
        name: 'eventId',
        description: 'Event ID, slug, or UUID v7 hash',
        type: 'string',
    })
    async getNextId(@Param('eventId') eventId: string) {
        const event = await this.eventsService.findByIdentifier(eventId);
        const nextNumericId = await this.qrCodesService.getNextId(event.id);
        const maxBatchSize = Number(process.env.MAX_BATCH_QR_COUNT) || 100;
        return { nextNumericId, maxBatchSize };
    }

    @Get('events/:eventId/qr-codes')
    @ApiOperation({ summary: 'Get QR codes for an event' })
    @ApiParam({
        name: 'eventId',
        description: 'Event ID, slug, or UUID v7 hash',
        type: 'string',
    })
    @ApiResponse({ status: 200, type: PaginatedResponseDto })
    async getQrCodes(
        @Param('eventId') eventId: string,
        @Query() query: QrCodeQueryDto,
    ) {
        const event = await this.eventsService.findByIdentifier(eventId);
        return this.qrCodesService.getQrCodesByEvent(event.id, query);
    }

    @Post('events/:eventId/qr-codes/bulk-update')
    @UseGuards(AdminStaffGuard)
    @ApiOperation({ summary: 'Bulk update QR codes - Admin/Staff only' })
    @ApiParam({
        name: 'eventId',
        description: 'Event ID, slug, or UUID v7 hash',
        type: 'string',
    })
    @ApiResponse({
        status: 200,
        description: 'QR codes successfully updated',
    })
    async bulkUpdate(
        @Param('eventId') eventId: string,
        @Body() dto: BulkUpdateQrCodeDto,
    ) {
        const event = await this.eventsService.findByIdentifier(eventId);
        return this.qrCodesService.bulkUpdate(event.id, dto);
    }

    @Post('events/:eventId/qr-codes/bulk-download')
    @UseGuards(AdminStaffGuard)
    @ApiOperation({ summary: 'Bulk download QR codes - Admin/Staff only' })
    @ApiParam({
        name: 'eventId',
        description: 'Event ID, slug, or UUID v7 hash',
        type: 'string',
    })
    @ApiResponse({
        status: 200,
        description: 'ZIP file containing QR codes',
    })
    async bulkDownload(
        @Param('eventId') eventId: string,
        @Body('qrCodeIds') qrCodeIds: number[],
        @Res() res: Response,
    ) {
        const event = await this.eventsService.findByIdentifier(eventId);
        return this.qrCodesService.bulkDownloadQr(event.id, qrCodeIds, res);
    }

    @Post('events/:eventId/qr-codes/generate-batch')
    @UseGuards(AdminStaffGuard)
    @ApiOperation({
        summary:
            'Batch generate QR codes with guest records - Admin/Staff only',
    })
    @ApiParam({
        name: 'eventId',
        description: 'Event ID, slug, or UUID v7 hash',
        type: 'string',
    })
    @ApiBody({ type: BatchGenerateQrDto })
    @ApiResponse({
        status: 201,
        description: 'Batch of QR codes successfully generated',
    })
    async generateBatch(
        @Param('eventId') eventId: string,
        @Body() dto: BatchGenerateQrDto,
    ) {
        const event = await this.eventsService.findByIdentifier(eventId);
        return this.qrCodesService.batchGenerate(event.id, dto);
    }

    @Patch('events/:eventId/qr-codes/:id')
    @UseGuards(AdminStaffGuard)
    @ApiOperation({ summary: 'Update a QR code - Admin/Staff only' })
    @ApiParam({
        name: 'eventId',
        description: 'Event ID, slug, or UUID v7 hash',
        type: 'string',
    })
    @ApiParam({ name: 'id', type: 'integer' })
    async updateQrCode(
        @Param('eventId') eventId: string,
        @Param('id') id: number,
        @Body() dto: UpdateQrCodeDto,
    ) {
        await this.eventsService.findByIdentifier(eventId);
        return this.qrCodesService.update(id, dto);
    }

    @Patch('events/:eventId/qr-codes/:id/redirect-link')
    @UseGuards(AdminStaffGuard)
    @ApiOperation({
        summary: 'Update QR code redirect link - Admin/Staff only',
    })
    @ApiParam({
        name: 'eventId',
        description: 'Event ID, slug, or UUID v7 hash',
        type: 'string',
    })
    @ApiParam({ name: 'id', type: 'integer' })
    @ApiResponse({
        status: 200,
        type: QrCode,
        description: 'Redirect link successfully updated',
    })
    async updateRedirectLink(
        @Param('eventId') eventId: string,
        @Param('id') id: number,
        @Body() dto: UpdateRedirectLinkDto,
    ) {
        await this.eventsService.findByIdentifier(eventId);
        return this.qrCodesService.updateRedirectLink(id, dto.redirectLink);
    }

    @Post('events/:eventId/scan-page/preview')
    @UseGuards(AdminStaffGuard)
    @ApiOperation({
        summary: 'Preview custom scan page template with real guest data',
    })
    @ApiParam({
        name: 'eventId',
        description: 'Event ID, slug, or UUID v7 hash',
        type: 'string',
    })
    @ApiResponse({
        status: 200,
        description: 'Rendered HTML preview',
    })
    async previewScanPage(
        @Param('eventId') eventId: string,
        @Body() dto: ScanPagePreviewDto,
        @Res() res: Response,
    ) {
        const event = await this.eventsService.findByIdentifier(eventId);

        // Find first QR code with guest for preview data
        const qrCode = await this.qrCodeRepo.findOne({
            where: { eventId: event.id },
            relations: ['guest', 'event'],
            order: { numericId: 'ASC' },
        });

        let templateData: Record<string, unknown> = {
            eventName: event.name || 'Event',
            guestName: null,
            mediaUrl: null,
            embedUrl: null,
            downloadUrl: null,
            isVideo: false,
            driveViewUrl: null,
            year: new Date().getFullYear(),
            isPreview: true,
        };

        if (qrCode?.guest) {
            const mediaInfo = await this.qrCodesService.resolveGuestMediaUrl(
                qrCode,
                event,
            );
            const embedUrl = mediaInfo?.embedUrl || null;
            const downloadUrl = mediaInfo?.downloadUrl || null;
            const isVideo = mediaInfo?.mimeType?.startsWith('video/') || false;
            const driveFileId = mediaInfo?.fileId;
            const driveViewUrl = driveFileId
                ? `https://drive.google.com/file/d/${driveFileId}/view?usp=sharing`
                : null;
            const mediaUrl = downloadUrl || embedUrl || null;

            templateData = {
                ...templateData,
                guestName: qrCode.guest.name || null,
                mediaUrl,
                embedUrl,
                downloadUrl,
                isVideo,
                driveViewUrl,
            };
        }

        try {
            const compiled = handlebars.compile(dto.template);
            const html = compiled(templateData);
            res.type('text/html').send(html);
        } catch (e) {
            this.logger.error(`Preview template compile error:`, e);
            res.status(400).json({
                statusCode: 400,
                message: 'Template compilation failed',
            });
        }
    }

    /**
     * T003: List all available .hbs scan page templates.
     * Returns array of TemplateMeta objects sorted by language then label.
     */
    @Get('events/:eventId/scan-page/templates')
    @UseGuards(AdminStaffGuard)
    @ApiTags('Scan Page Templates')
    @ApiOperation({ summary: 'List available scan page templates' })
    @ApiParam({
        name: 'eventId',
        description: 'Event ID, slug, or UUID v7 hash',
        type: 'string',
    })
    @ApiResponse({
        status: 200,
        description: 'List of available templates',
        schema: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    id: { type: 'string', description: 'Template identifier' },
                    label: {
                        type: 'string',
                        description: 'Human-readable name',
                    },
                    language: {
                        type: 'string',
                        description: 'ISO 639-1 language code',
                    },
                    isDefault: {
                        type: 'boolean',
                        description:
                            'True for the canonical default template (first en template)',
                    },
                    contentHash: {
                        type: 'string',
                        description:
                            'Short SHA-256 hash prefix (12 chars) of template content for browser cache staleness detection',
                    },
                },
            },
        },
    })
    async getScanPageTemplates(@Param('eventId') eventId: string) {
        await this.eventsService.findByIdentifier(eventId);
        return this.qrCodesService.getAvailableTemplates();
    }

    /**
     * T004: Get raw content of a specific .hbs template file.
     * Returns content as text/plain.
     */
    @Get('events/:eventId/scan-page/templates/:id/content')
    @UseGuards(AdminStaffGuard)
    @ApiTags('Scan Page Templates')
    @ApiOperation({ summary: 'Get scan page template content' })
    @ApiParam({
        name: 'eventId',
        description: 'Event ID, slug, or UUID v7 hash',
        type: 'string',
    })
    @ApiParam({
        name: 'id',
        description: 'Template identifier (from template list id field)',
        type: 'string',
    })
    @ApiResponse({
        status: 200,
        description: 'Raw template content as text/plain',
    })
    @ApiResponse({ status: 400, description: 'Invalid template name' })
    @ApiResponse({ status: 404, description: 'Template not found' })
    async getScanPageTemplateContent(
        @Param('eventId') eventId: string,
        @Param('id') id: string,
        @Res() res: Response,
    ) {
        await this.eventsService.findByIdentifier(eventId);
        const content = await this.qrCodesService.getTemplateContent(id);
        res.type('text/plain').send(content);
    }

    /**
     * T080-T082: Public QR code scan endpoint
     * QR links are always generated with UUID v7 hash, but this endpoint
     * accepts any identifier format because the Navigation Strategy may
     * redirect UUID → slug/numeric/slug-with-id.
     */
    @Get('e/:eventIdentifier/qr/:qrId')
    @Public()
    @ApiTags('Redirects')
    @ApiOperation({
        summary: 'QR Code Public Endpoint - Scan destination',
    })
    @ApiParam({
        name: 'eventIdentifier',
        description:
            'Event identifier (UUID hash, slug, numeric ID, or slug-with-id)',
        type: 'string',
    })
    @ApiParam({
        name: 'qrId',
        description: 'QR event-scoped numeric ID',
        type: 'integer',
    })
    @ApiResponse({
        status: 302,
        description:
            'Temporary redirect if current Navigation Strategy requires it',
    })
    @ApiResponse({
        status: 302,
        description: 'Temporary redirect if manual redirectLink is set',
    })
    @ApiResponse({
        status: 200,
        description: 'URL is current, serving server-rendered QR scan page',
    })
    @ApiResponse({ status: 404, description: 'Event or QR code not found' })
    async scanQrCode(
        @Param('eventIdentifier') eventIdentifier: string,
        @Param('qrId') numericId: number,
        @Res() res: Response,
        @Req() req: any,
    ) {
        try {
            this.logger.debug(
                `Scan QR: eventIdentifier=${eventIdentifier}, numericId=${numericId}`,
            );
            // Find event using any identifier format (UUID, slug, numeric, slug-with-id)
            const event =
                await this.eventsService.findByIdentifier(eventIdentifier);
            this.logger.debug(
                `Found event: id=${event.id}, name=${event.name}, urlStrategy=${event.urlStrategy}, urlHash=${event.urlHash}`,
            );

            // Validate identifier format: only UUID (QR entry point) or the
            // current Navigation Strategy format are allowed.
            const isUuid =
                /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
                    eventIdentifier,
                );

            if (!isUuid) {
                // Check if the identifier matches the event's current Navigation Strategy
                let matchesStrategy = false;
                switch (event.urlStrategy) {
                    case UrlStrategy.HASH:
                        matchesStrategy = eventIdentifier === event.urlHash;
                        break;
                    case UrlStrategy.PURE_SLUG:
                        matchesStrategy = eventIdentifier === event.slug;
                        break;
                    case UrlStrategy.SLUG_WITH_ID:
                        matchesStrategy =
                            eventIdentifier === `${event.slug}-${event.id}`;
                        break;
                    case UrlStrategy.NUMERIC:
                        matchesStrategy = eventIdentifier === `${event.id}`;
                        break;
                }

                if (!matchesStrategy) {
                    throw new NotFoundException('Event or QR code not found');
                }
            }

            // T024: Redirect from UUID to current format based on urlStrategy
            const { targetUrl, needsRedirect } =
                this.eventsService.buildQrUrlWithRedirect(
                    eventIdentifier,
                    numericId,
                    event,
                );

            if (needsRedirect) {
                // Use 302 (temporary) because Navigation Strategy can change
                return res.redirect(302, targetUrl);
            }

            // Task 2.6: Access Control Check
            if (event.requireAuthForQrScan) {
                // Simple check for req.user (populated if JwtAuthGuard or similar used)
                if (!req.user) {
                    return res
                        .status(401)
                        .send('Authentication required to view this content');
                }
            }

            // Find QR code in this event
            this.logger.debug(
                `Looking for QR code: numericId=${numericId}, eventId=${event.id}`,
            );
            const qrCode = await this.qrCodeRepo.findOne({
                where: { numericId, eventId: event.id },
                relations: ['guest', 'event'],
            });

            if (!qrCode) {
                this.logger.warn(
                    `QR code not found: numericId=${numericId}, eventId=${event.id}`,
                );
                return res.status(404).send('QR code not found');
            }
            this.logger.debug(`Found QR code: id=${qrCode.id}`);

            // T079: Record first scan (idempotent — only set if null)
            try {
                if (!qrCode.guest?.scannedAt) {
                    await this.guestRepo.update(qrCode.guest.id, {
                        scannedAt: new Date(),
                    });
                }
            } catch (scanError) {
                // Best-effort: scan recording failure must NOT break the QR page
                this.logger.warn('Failed to record first scan:', scanError);
            }

            // US1: Deny access if guest status is Denied
            if (qrCode.guest?.status === 'Denied') {
                return res.status(403).send('Guest Denied');
            }

            // T081: HTTP 302 redirect if redirectLink or customMediaUrl is set
            if (qrCode.redirectLink) {
                // Mark guest as Complete — media is being delivered via redirect
                this.markGuestComplete(qrCode.guest.id).catch(() => {});
                return res.redirect(302, qrCode.redirectLink);
            }

            // Check QrCode.customMediaUrl first, then guest.customMediaUrl
            const customUrl =
                qrCode.customMediaUrl || qrCode.guest?.customMediaUrl;
            if (customUrl) {
                // Mark guest as Complete — media is being delivered via redirect
                this.markGuestComplete(qrCode.guest.id).catch(() => {});
                return res.redirect(302, customUrl);
            }

            // T082: Server-rendered HTML page with media/placeholder
            const mediaInfo = await this.qrCodesService.resolveGuestMediaUrl(
                qrCode,
                event,
            );

            // T010: Extract embedUrl, downloadUrl, isVideo from DriveFileInfoDto
            const embedUrl = mediaInfo?.embedUrl || null;
            const downloadUrl = mediaInfo?.downloadUrl || null;
            const isVideo = mediaInfo?.mimeType?.startsWith('video/') || false;
            const thumbnailUrl = mediaInfo?.thumbnailUrl || null;

            const mediaUrl = downloadUrl || embedUrl || null;

            // Extract Google Drive file ID for "Open in Drive" link
            const driveFileId = mediaInfo?.fileId;
            const driveViewUrl = driveFileId
                ? `https://drive.google.com/file/d/${driveFileId}/view?usp=sharing`
                : null;

            const templateData = {
                eventName: event.name || 'Event',
                guestName: qrCode.guest?.name || null,
                mediaUrl,
                embedUrl,
                downloadUrl,
                isVideo,
                thumbnailUrl,
                driveViewUrl,
                year: new Date().getFullYear(),
            };

            // Mark guest as Complete if actual media was resolved (not placeholder)
            if (embedUrl || downloadUrl) {
                this.markGuestComplete(qrCode.guest.id).catch(() => {});
            }

            // Priority 1: Named built-in template selected without modification
            if (event.scanPageTemplateId) {
                try {
                    const content = await this.qrCodesService.getTemplateContent(
                        event.scanPageTemplateId,
                    );
                    const compiledFn = this.qrCodesService.getCompiledTemplate(
                        event.id,
                        content,
                    );
                    const html = compiledFn(templateData);
                    return res.send(html);
                } catch (e) {
                    this.logger.error(
                        `Named template render error (${event.scanPageTemplateId}) for event ${event.id}:`,
                        e,
                    );
                    // Fallback to default template
                }
            }

            // Priority 2: Custom HTML template saved by user
            if (event.scanPageTemplate) {
                try {
                    const compiledFn = this.qrCodesService.getCompiledTemplate(
                        event.id,
                        event.scanPageTemplate,
                    );
                    const html = compiledFn(templateData);
                    return res.send(html);
                } catch (e) {
                    this.logger.error(
                        `Custom template render error for event ${event.id}:`,
                        e,
                    );
                    // Fallback to default template
                }
            }

            // Priority 3: Default template
            res.render('qr-scan-page', templateData);
        } catch (error) {
            if (
                error instanceof NotFoundException ||
                error.name === 'EntityNotFound' ||
                error.status === 404
            ) {
                return res.status(404).send('Event or QR code not found');
            }
            console.error('Scan Error:', error);
            return res.status(500).send('Internal Server Error');
        }
    }

    // Legacy endpoint (JSON redirect)
    @Get('qr/:eventId/:numericId')
    @Public()
    @ApiTags('Redirects')
    @ApiOperation({ summary: 'QR Code Redirect Endpoint (Legacy JSON)' })
    @ApiParam({
        name: 'eventId',
        description: 'Event ID, slug, or UUID v7 hash',
        type: 'string',
    })
    @ApiParam({ name: 'numericId', type: 'integer' })
    async redirect(
        @Param('eventId') eventId: string,
        @Param('numericId') numericId: number,
    ) {
        const event = await this.eventsService.findByIdentifier(eventId);
        const qrCode = await this.qrCodeRepo.findOne({
            where: {
                eventId: event.id,
                numericId,
            },
            relations: ['guest', 'event'],
        });

        if (!qrCode) {
            throw new NotFoundException('QR code not found');
        }

        // Resolve redirect target
        // Priority: 1) per-QR redirectLink, 2) per-QR customMediaUrl (handled upstream),
        // 3) event-level media folder resolution, 4) fallback scan page URL
        let redirectUrl = qrCode.redirectLink;
        if (!redirectUrl) {
            // Use UUID (urlHash) for QR scan page URL - never numeric event ID
            const domain = process.env.FRONTEND_URL || 'domain.com';
            const cleanDomain = domain
                .replace('https://', '')
                .replace(/\/+$/, '');
            const eventIdentifier = event.urlHash || event.id;
            redirectUrl = `https://${cleanDomain}/e/${eventIdentifier}/qr/${numericId}`;
        }

        return {
            redirect: redirectUrl,
            guest: qrCode.guest ? qrCode.guest.name : null,
        };
    }

    /**
     * Best-effort helper to mark a guest's status as 'Complete'.
     * Called when media is successfully delivered (redirect or served).
     * Non-blocking — failures are silently ignored to avoid breaking the response.
     */
    private async markGuestComplete(guestId: number): Promise<void> {
        try {
            await this.guestRepo.update(guestId, { status: 'Complete' });
        } catch {
            // Best-effort: status update failure should not break the response
        }
    }
}
