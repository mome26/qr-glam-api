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
    BadRequestException,
    UseGuards,
    Request,
} from '@nestjs/common';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiParam,
    ApiBadRequestResponse,
    ApiNotFoundResponse,
} from '@nestjs/swagger';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { CreateMediaDto } from './dto/create-media.dto';
import { UpdateMediaDto } from './dto/update-media.dto';
import { EventSettingsDto } from './dto/event-settings.dto';
import { EventSettingsResponseDto } from './dto/event-settings-response.dto';
import { EventStatisticsDto } from './dto/event-statistics.dto';
import { GlobalStatisticsDto } from './dto/global-statistics.dto';
import { EventQueryDto } from './dto/event-query.dto';
import { MediaQueryDto } from './dto/media-query.dto';
import { ActivityQueryDto } from './dto/activity-query.dto';
import { Event } from './entities/event.entity';
import { Media } from './entities/media.entity';
import { JwtAuthGuard } from '../auth/strategies/jwt-auth.guard';
import { AdminStaffGuard } from '../auth/guards/admin-staff.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

@Controller('events')
@ApiTags('Events')
@UseGuards(JwtAuthGuard)
export class EventsController {
    constructor(private readonly eventsService: EventsService) {}

    @Post()
    @UseGuards(AdminStaffGuard)
    @ApiOperation({ summary: 'Create a new event - Admin/Staff only' })
    @ApiResponse({
        status: 201,
        description: 'Event successfully created',
        type: Event,
    })
    @ApiBadRequestResponse({ description: 'Invalid input data' })
    create(@Body() createEventDto: CreateEventDto, @Request() req) {
        return this.eventsService.create(createEventDto, req.user.id);
    }

    @Get()
    @ApiOperation({ summary: 'Get all events' })
    @ApiResponse({
        status: 200,
        description: 'List of all events (paginated)',
        type: PaginatedResponseDto,
    })
    async findAll(@Request() req, @Query() query: EventQueryDto) {
        return this.eventsService.findAll(req.user.id, req.user.role, query);
    }

    @Get('upcoming')
    @ApiOperation({ summary: 'Get all upcoming events' })
    @ApiResponse({
        status: 200,
        description: 'List of upcoming events',
        type: [Event],
    })
    findUpcoming(@Request() req) {
        return this.eventsService.findUpcoming(req.user.id, req.user.role);
    }

    @Get('qr-codes/:qrCodeId')
    @ApiOperation({ summary: 'Get events associated with a QR code' })
    @ApiParam({
        name: 'qrCodeId',
        description: 'QR code ID',
        type: 'integer',
    })
    @ApiResponse({
        status: 200,
        description: 'List of events for the QR code',
        type: [Event],
    })
    async findByQrCodeId(@Param('qrCodeId') qrCodeId: number) {
        return this.eventsService.findByQrCodeId(qrCodeId);
    }

    // Media Endpoints
    @Post(':eventId/media')
    @UseGuards(AdminStaffGuard)
    @ApiOperation({ summary: 'Upload media to an event - Admin/Staff only' })
    @ApiParam({
        name: 'eventId',
        description: 'Event ID, slug, or UUID v7 hash',
        type: 'string',
    })
    @ApiResponse({
        status: 201,
        description: 'Media successfully uploaded',
        type: Media,
    })
    async createMedia(
        @Param('eventId') eventId: string,
        @Body() createMediaDto: CreateMediaDto,
    ) {
        const event = await this.eventsService.findByIdentifier(eventId);
        createMediaDto.eventId = event.id;
        return this.eventsService.createMedia(createMediaDto);
    }

    @Get(':eventId/media')
    @ApiOperation({ summary: 'Get all media for an event' })
    @ApiParam({
        name: 'eventId',
        description: 'Event ID, slug, or UUID v7 hash',
        type: 'string',
    })
    @ApiResponse({
        status: 200,
        description: 'List of media items (paginated)',
        type: PaginatedResponseDto,
    })
    async getMediaByEvent(
        @Param('eventId') eventId: string,
        @Query() query: MediaQueryDto,
    ) {
        const event = await this.eventsService.findByIdentifier(eventId);
        return this.eventsService.findMediaByEventId(event.id, query);
    }

    @Get(':eventId/media/:id')
    @ApiOperation({ summary: 'Get a specific media item' })
    @ApiParam({
        name: 'id',
        description: 'Media ID',
        type: 'integer',
    })
    @ApiResponse({
        status: 200,
        description: 'Media found',
        type: Media,
    })
    @ApiNotFoundResponse({ description: 'Media not found' })
    async getMedia(@Param('id') id: number) {
        const media = await this.eventsService.findMedia(id);
        if (!media) {
            throw new NotFoundException(`Media with ID ${id} not found`);
        }
        return media;
    }

    @Patch(':eventId/media/:id')
    @UseGuards(AdminStaffGuard)
    @ApiOperation({ summary: 'Update a media item - Admin/Staff only' })
    @ApiParam({
        name: 'id',
        description: 'Media ID',
        type: 'integer',
    })
    @ApiResponse({
        status: 200,
        description: 'Media successfully updated',
        type: Media,
    })
    async updateMedia(
        @Param('id') id: number,
        @Body() updateMediaDto: UpdateMediaDto,
    ) {
        const media = await this.eventsService.findMedia(id);
        if (!media) {
            throw new NotFoundException(`Media with ID ${id} not found`);
        }
        return this.eventsService.updateMedia(id, updateMediaDto);
    }

    @Delete(':eventId/media/:id')
    @UseGuards(AdminStaffGuard)
    @ApiOperation({ summary: 'Delete a media item - Admin/Staff only' })
    @ApiParam({
        name: 'id',
        description: 'Media ID',
        type: 'integer',
    })
    @ApiResponse({
        status: 200,
        description: 'Media successfully deleted',
    })
    @ApiNotFoundResponse({ description: 'Media not found' })
    async removeMedia(@Param('id') id: number) {
        const media = await this.eventsService.findMedia(id);
        if (!media) {
            throw new NotFoundException(`Media with ID ${id} not found`);
        }
        await this.eventsService.removeMedia(id);
        return { success: true };
    }

    // Activity Endpoints
    @Get(':eventId/activities')
    @ApiOperation({ summary: 'Get recent activities for an event' })
    @ApiParam({
        name: 'eventId',
        description: 'Event ID, slug, or UUID v7 hash',
        type: 'string',
    })
    @ApiResponse({
        status: 200,
        description: 'List of recent activities (paginated)',
        type: PaginatedResponseDto,
    })
    async getActivities(
        @Param('eventId') eventId: string,
        @Query() query: ActivityQueryDto,
    ) {
        const event = await this.eventsService.findByIdentifier(eventId);
        return this.eventsService.findActivitiesByEventId(event.id, query);
    }

    // Settings Endpoints
    @Get(':eventId/settings')
    @ApiOperation({ summary: 'Get event settings' })
    @ApiParam({
        name: 'eventId',
        description: 'Event ID, slug, or UUID v7 hash',
        type: 'string',
    })
    @ApiResponse({
        status: 200,
        description: 'Event settings',
        type: EventSettingsResponseDto,
    })
    @ApiNotFoundResponse({ description: 'Event not found' })
    async getSettings(
        @Param('eventId') eventId: string,
    ): Promise<EventSettingsResponseDto> {
        const event = await this.eventsService.findByIdentifier(eventId);
        const settings = await this.eventsService.getEventSettings(event.id);
        if (!settings) {
            throw new NotFoundException(
                `Event settings for ${eventId} not found`,
            );
        }
        return settings;
    }

    @Patch(':eventId/settings')
    @UseGuards(AdminStaffGuard)
    @ApiOperation({ summary: 'Update event settings - Admin/Staff only' })
    @ApiParam({
        name: 'eventId',
        description: 'Event ID, slug, or UUID v7 hash',
        type: 'string',
    })
    @ApiResponse({
        status: 200,
        description: 'Settings successfully updated',
        type: EventSettingsResponseDto,
    })
    @ApiNotFoundResponse({ description: 'Event not found' })
    async updateSettings(
        @Param('eventId') eventId: string,
        @Body() settingsDto: EventSettingsDto,
    ): Promise<EventSettingsResponseDto> {
        const event = await this.eventsService.findByIdentifier(eventId);
        const settings = await this.eventsService.updateEventSettings(
            event.id,
            settingsDto,
        );
        if (!settings) {
            throw new NotFoundException(
                `Event settings for ${eventId} not found`,
            );
        }
        return settings;
    }

    // Statistics Endpoint
    @Get(':eventId/statistics')
    @ApiOperation({ summary: 'Get event statistics' })
    @ApiParam({
        name: 'eventId',
        description: 'Event ID, slug, or UUID v7 hash',
        type: 'string',
    })
    @ApiResponse({
        status: 200,
        description: 'Event statistics',
        type: EventStatisticsDto,
    })
    @ApiNotFoundResponse({ description: 'Event not found' })
    async getStatistics(
        @Param('eventId') eventId: string,
    ): Promise<EventStatisticsDto> {
        const event = await this.eventsService.findByIdentifier(eventId);
        const stats = await this.eventsService.getEventStatistics(event.id);
        if (!stats) {
            throw new NotFoundException(
                `Statistics for event ${eventId} not found`,
            );
        }
        return stats;
    }

    // Global Statistics Endpoint
    @Get('statistics/global')
    @UseGuards(AdminStaffGuard)
    @ApiOperation({
        summary: 'Get global statistics across all events - Admin/Staff only',
    })
    @ApiResponse({
        status: 200,
        description: 'Global statistics',
        type: GlobalStatisticsDto,
    })
    async getGlobalStatistics(): Promise<GlobalStatisticsDto> {
        return this.eventsService.getGlobalStatistics();
    }

    // Event ID Dynamic Routes
    @Get(':id')
    @ApiOperation({ summary: 'Get a specific event by identifier' })
    @ApiParam({
        name: 'id',
        description: 'Event ID, slug, or UUID v7 hash',
        type: 'string',
    })
    @ApiResponse({
        status: 200,
        description: 'Event found',
        type: Event,
    })
    @ApiNotFoundResponse({ description: 'Event not found' })
    async findOne(@Param('id') id: string) {
        return this.eventsService.findByIdentifier(id);
    }

    // Admin-only endpoint to backfill urlHash for legacy events
    @Post('admin/backfill-url-hashes')
    @UseGuards(AdminGuard)
    @ApiOperation({
        summary: 'Backfill urlHash for legacy events (Admin only)',
    })
    @ApiResponse({
        status: 200,
        description: 'Number of events updated',
        schema: { example: { updated: 5 } },
    })
    async backfillUrlHashes() {
        return this.eventsService.backfillUrlHashes();
    }

    @Patch(':id')
    @UseGuards(AdminStaffGuard)
    @ApiOperation({ summary: 'Update an event - Admin/Staff only' })
    @ApiParam({
        name: 'id',
        description: 'Event ID, slug, or UUID v7 hash',
        type: 'string',
    })
    @ApiResponse({
        status: 200,
        description: 'Event successfully updated',
        type: Event,
    })
    @ApiNotFoundResponse({ description: 'Event not found' })
    @ApiBadRequestResponse({ description: 'Invalid input data' })
    async update(
        @Param('id') id: string,
        @Body() updateEventDto: UpdateEventDto,
        @Request() req,
    ) {
        const event = await this.eventsService.findByIdentifier(id);
        return this.eventsService.update(
            event.id,
            updateEventDto,
            req.user.id,
            req.user.role,
        );
    }

    @Post(':id/register')
    @ApiOperation({ summary: 'Register an attendee for an event' })
    @ApiParam({
        name: 'id',
        description: 'Event ID, slug, or UUID v7 hash',
        type: 'string',
    })
    @ApiResponse({
        status: 200,
        description: 'Attendee successfully registered',
        type: Event,
    })
    @ApiNotFoundResponse({ description: 'Event not found' })
    async registerAttendee(@Param('id') id: string) {
        const event = await this.eventsService.findByIdentifier(id);

        if (
            event.maxAttendees &&
            event.registeredAttendees >= event.maxAttendees
        ) {
            throw new BadRequestException('Event is at maximum capacity');
        }

        return this.eventsService.registerAttendee(event.id);
    }

    @Post(':id/unregister')
    @ApiOperation({ summary: 'Unregister an attendee from an event' })
    @ApiParam({
        name: 'id',
        description: 'Event ID, slug, or UUID v7 hash',
        type: 'string',
    })
    @ApiResponse({
        status: 200,
        description: 'Attendee successfully unregistered',
        type: Event,
    })
    @ApiNotFoundResponse({ description: 'Event not found' })
    async unregisterAttendee(@Param('id') id: string): Promise<Event> {
        const event = await this.eventsService.findByIdentifier(id);
        return this.eventsService.unregisterAttendee(event.id);
    }

    @Delete(':id')
    @UseGuards(AdminStaffGuard)
    @ApiOperation({
        summary:
            'Soft-delete an event and cascade soft-delete to all attendees - Admin/Staff only',
    })
    @ApiParam({
        name: 'id',
        description: 'Event ID, slug, or UUID v7 hash',
        type: 'string',
    })
    @ApiResponse({
        status: 200,
        description: 'Event and associated records successfully soft-deleted',
    })
    @ApiNotFoundResponse({ description: 'Event not found' })
    async remove(@Param('id') id: string, @Request() req) {
        const event = await this.eventsService.findByIdentifier(id);
        await this.eventsService.remove(event.id, req.user.id, req.user.role);
        return { success: true };
    }
}
