import {
    Controller,
    Get,
    Query,
    Param,
    Res,
    NotFoundException,
    BadRequestException,
    ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { Response } from 'express';
import { AppService } from './app.service';
import { EventsService } from './events/events.service';
import { QrCodesService } from './qr-codes/qr-codes.service';
import { GuestsService } from './guests/guests.service';

@Controller()
@ApiTags('Health')
export class AppController {
    constructor(
        private readonly appService: AppService,
        private readonly eventsService: EventsService,
        private readonly qrCodesService: QrCodesService,
        private readonly guestsService: GuestsService,
    ) {}

    @Get()
    @ApiOperation({ summary: 'Get welcome message' })
    @ApiResponse({ status: 200, description: 'Welcome message' })
    getHello(): string {
        return this.appService.getHello();
    }

    @Get('health')
    @ApiOperation({ summary: 'Check API health' })
    @ApiResponse({ status: 200, description: 'API is healthy' })
    health() {
        return { status: 'ok' };
    }

    @Get('qr/:eventId/:numericId')
    @ApiTags('Redirects')
    @ApiOperation({ summary: 'New QR redirect endpoint' })
    async newRedirect(
        @Param('eventId', ParseIntPipe) eventId: number,
        @Param('numericId', ParseIntPipe) numericId: number,
        @Res() res: Response,
    ) {
        const target = await this.qrCodesService.findOneByNumericId(
            eventId,
            numericId,
        );

        if (!target || !target.guestId) {
            throw new NotFoundException('QR code or assigned guest not found');
        }

        const guest = await this.guestsService.findOne(target.guestId);
        if (!guest || !guest.customMediaUrl) {
            throw new NotFoundException('Guest or media not found');
        }

        return res.redirect(guest.customMediaUrl);
    }

    @Get('qr-redirect')
    @ApiTags('Redirects')
    @ApiOperation({
        summary: 'QR code redirect endpoint',
        description:
            'Redirects to the customMediaUrl of the guest assigned to the QR code',
    })
    @ApiQuery({ name: 'event', type: 'string', description: 'Event ID' })
    @ApiQuery({ name: 'qr', type: 'string', description: 'QR Code ID' })
    @ApiQuery({
        name: 'identifier',
        type: 'string',
        description: 'QR Code Identifier',
    })
    @ApiResponse({ status: 302, description: 'Redirect to custom media URL' })
    @ApiResponse({ status: 400, description: 'Invalid parameters' })
    @ApiResponse({ status: 404, description: 'Guest or QR code not found' })
    async qrRedirect(
        @Query('event') eventId: string,
        @Query('qr') qrCodeId: string,
        @Query('identifier') identifier: string,
        @Res() res: Response,
    ) {
        if (!eventId || !qrCodeId || !identifier) {
            throw new BadRequestException(
                'Missing required query parameters: event, qr, identifier',
            );
        }

        // Get QR code and verify it belongs to the event
        const qrCode = await this.qrCodesService.findOne(parseInt(qrCodeId));
        if (!qrCode) {
            throw new NotFoundException(
                `QR code with ID ${qrCodeId} not found`,
            );
        }

        if (qrCode.eventId !== parseInt(eventId)) {
            throw new BadRequestException(
                'QR code does not belong to the specified event',
            );
        }

        // Get the guest assigned to this QR code
        if (!qrCode.guestId) {
            throw new NotFoundException('No guest assigned to this QR code');
        }

        const guest = await this.guestsService.findOne(qrCode.guestId);
        if (!guest) {
            throw new NotFoundException(
                `Guest with ID ${qrCode.guestId} not found`,
            );
        }

        // Get custom media URL
        if (!guest.customMediaUrl) {
            throw new NotFoundException(
                'Guest does not have a custom media URL assigned',
            );
        }

        // Redirect to the custom media URL
        return res.redirect(guest.customMediaUrl);
    }
}
