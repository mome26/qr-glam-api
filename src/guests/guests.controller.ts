import {
    Controller,
    Get,
    Post,
    Body,
    Param,
    Delete,
    Patch,
    Query,
    UseGuards,
    UseInterceptors,
    UploadedFile,
    Res,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { GuestsService } from './guests.service';
import { EventsService } from '../events/events.service';
import { GuestQueryDto } from './dto/guest-query.dto';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';
import { CreateGuestDto } from './dto/create-guest.dto';
import { UpdateGuestDto } from './dto/update-guest.dto';
import { BulkUpdateGuestsDto } from './dto/bulk-update-guests.dto';
import { BulkDeleteGuestsDto } from './dto/bulk-delete-guests.dto';
import { Guest } from './entities/guest.entity';
import { JwtAuthGuard } from '../auth/strategies/jwt-auth.guard';
import { AdminStaffGuard } from '../auth/guards/admin-staff.guard';
import { Inject, forwardRef } from '@nestjs/common';

@ApiTags('Guests')
@Controller('events/:eventId/guests')
@UseGuards(JwtAuthGuard)
export class GuestsController {
    constructor(
        private readonly guestsService: GuestsService,
        @Inject(forwardRef(() => EventsService))
        private readonly eventsService: EventsService,
    ) {}

    @Post()
    @UseGuards(AdminStaffGuard)
    @ApiOperation({ summary: 'Add a guest to an event - Admin/Staff only' })
    @ApiParam({
        name: 'eventId',
        description: 'Event ID, slug, or hash',
        type: 'string',
    })
    @ApiResponse({ status: 201, type: Guest })
    async create(
        @Param('eventId') eventId: string,
        @Body() createGuestDto: CreateGuestDto,
    ) {
        const event = await this.eventsService.findByIdentifier(eventId);
        return this.guestsService.createGuest(createGuestDto, event.id);
    }

    @Post('batch')
    @UseGuards(AdminStaffGuard)
    @ApiOperation({
        summary: 'Add multiple guests to an event - Admin/Staff only',
    })
    @ApiParam({
        name: 'eventId',
        description: 'Event ID, slug, or hash',
        type: 'string',
    })
    @ApiResponse({ status: 201, type: [Guest] })
    async batchCreate(
        @Param('eventId') eventId: string,
        @Body() dtos: CreateGuestDto[],
    ) {
        const event = await this.eventsService.findByIdentifier(eventId);
        return this.guestsService.batchCreate(dtos, event.id);
    }

    @Get()
    @ApiOperation({ summary: 'Get all guests for an event' })
    @ApiParam({
        name: 'eventId',
        description: 'Event ID, slug, or hash',
        type: 'string',
    })
    @ApiResponse({ status: 200, type: PaginatedResponseDto })
    async findAll(
        @Param('eventId') eventId: string,
        @Query() query: GuestQueryDto,
    ) {
        const event = await this.eventsService.findByIdentifier(eventId);
        return this.guestsService.findAll(event.id, query);
    }

    @Get(':guestId')
    @ApiOperation({ summary: 'Get a guest' })
    @ApiParam({
        name: 'eventId',
        description: 'Event ID, slug, or hash',
        type: 'string',
    })
    @ApiParam({ name: 'guestId', description: 'Guest ID', type: 'integer' })
    @ApiResponse({ status: 200, type: Guest })
    async findOne(
        @Param('eventId') eventId: string,
        @Param('guestId') guestId: number,
    ) {
        // Note: We don't strictly need eventId for findOne if guestId is global,
        // but we keep it for consistency and possible scope check.
        return this.guestsService.findOne(guestId);
    }

    @Patch(':guestId')
    @UseGuards(AdminStaffGuard)
    @ApiOperation({ summary: 'Update a guest - Admin/Staff only' })
    @ApiParam({
        name: 'eventId',
        description: 'Event ID, slug, or hash',
        type: 'string',
    })
    @ApiParam({ name: 'guestId', description: 'Guest ID', type: 'integer' })
    @ApiResponse({ status: 200, type: Guest })
    async update(
        @Param('eventId') eventId: string,
        @Param('guestId') guestId: number,
        @Body() updateGuestDto: UpdateGuestDto,
    ) {
        const event = await this.eventsService.findByIdentifier(eventId);
        return this.guestsService.updateGuest(
            event.id,
            guestId,
            updateGuestDto,
        );
    }

    @Delete(':guestId')
    @UseGuards(AdminStaffGuard)
    @ApiOperation({
        summary:
            'DEPRECATED: Use PATCH with status=Denied instead. Deactivates a guest by setting status to Denied - Admin/Staff only',
        deprecated: true,
    })
    @ApiParam({
        name: 'eventId',
        description: 'Event ID, slug, or hash',
        type: 'string',
    })
    @ApiParam({ name: 'guestId', description: 'Guest ID', type: 'integer' })
    @ApiResponse({
        status: 200,
        description:
            'Guest deactivated (status set to Denied). Redirect to PATCH /:id',
        type: Guest,
    })
    async remove(
        @Param('eventId') eventId: string,
        @Param('guestId') guestId: number,
    ) {
        const event = await this.eventsService.findByIdentifier(eventId);
        return this.guestsService.updateGuest(event.id, guestId, {
            status: 'Denied' as any,
        });
    }

    @Post('bulk-update')
    @UseGuards(AdminStaffGuard)
    @ApiOperation({
        summary: 'Bulk update guests in an event - Admin/Staff only',
    })
    @ApiParam({
        name: 'eventId',
        description: 'Event ID, slug, or hash',
        type: 'string',
    })
    @ApiResponse({ status: 200 })
    async bulkUpdate(
        @Param('eventId') eventId: string,
        @Body() dto: BulkUpdateGuestsDto,
    ) {
        const event = await this.eventsService.findByIdentifier(eventId);
        await this.guestsService.bulkUpdate(event.id, dto);
        return { success: true };
    }

    @Post('bulk-delete')
    @UseGuards(AdminStaffGuard)
    @ApiOperation({
        summary: 'Bulk soft-delete guests from an event - Admin/Staff only',
    })
    @ApiParam({
        name: 'eventId',
        description: 'Event ID, slug, or hash',
        type: 'string',
    })
    @ApiResponse({
        status: 200,
        description: 'Guests successfully soft-deleted',
    })
    async bulkDelete(
        @Param('eventId') eventId: string,
        @Body() dto: BulkDeleteGuestsDto,
    ) {
        const event = await this.eventsService.findByIdentifier(eventId);
        await this.guestsService.bulkSoftDelete(event.id, dto);
        return { success: true };
    }

    @Post('export-csv')
    @UseGuards(AdminStaffGuard)
    @ApiOperation({ summary: 'Export guests to CSV - Admin/Staff only' })
    @ApiParam({
        name: 'eventId',
        description: 'Event ID, slug, or hash',
        type: 'string',
    })
    @ApiResponse({ status: 200, type: String })
    async exportCsv(
        @Param('eventId') eventId: string,
        @Res() res: Response,
        @Body() body?: { guestIds?: number[] },
    ) {
        const event = await this.eventsService.findByIdentifier(eventId);
        const csv = await this.guestsService.exportCsv(
            event.id,
            body?.guestIds,
        );
        res.header('Content-Type', 'text/csv');
        res.attachment('guests.csv');
        return res.send(csv);
    }

    @Post('import-csv')
    @UseGuards(AdminStaffGuard)
    @UseInterceptors(FileInterceptor('file'))
    @ApiOperation({ summary: 'Import guests from CSV - Admin/Staff only' })
    @ApiParam({
        name: 'eventId',
        description: 'Event ID, slug, or hash',
        type: 'string',
    })
    @ApiResponse({ status: 201 })
    async importCsv(
        @Param('eventId') eventId: string,
        @UploadedFile() file: any,
    ) {
        if (!file) {
            return { success: false, message: 'No file uploaded' };
        }
        const event = await this.eventsService.findByIdentifier(eventId);
        const csvData = file.buffer.toString('utf8');
        const result = await this.guestsService.importCsv(event.id, csvData);
        return result;
    }
}
