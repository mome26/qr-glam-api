import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { EventsService } from './events/events.service';
import { QrCodesService } from './qr-codes/qr-codes.service';
import { GuestsService } from './guests/guests.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { Response } from 'express';

describe('AppController', () => {
    let controller: AppController;
    let qrCodesService: QrCodesService;
    let guestsService: GuestsService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [AppController],
            providers: [
                {
                    provide: AppService,
                    useValue: {
                        getHello: jest.fn().mockReturnValue('Hello World!'),
                    },
                },
                {
                    provide: EventsService,
                    useValue: {},
                },
                {
                    provide: QrCodesService,
                    useValue: {
                        findOneByNumericId: jest.fn(),
                        findOne: jest.fn(),
                    },
                },
                {
                    provide: GuestsService,
                    useValue: {
                        findOne: jest.fn(),
                    },
                },
            ],
        }).compile();

        controller = module.get<AppController>(AppController);
        qrCodesService = module.get<QrCodesService>(QrCodesService);
        guestsService = module.get<GuestsService>(GuestsService);
    });

    describe('getHello', () => {
        it('should return "Hello World!"', () => {
            expect(controller.getHello()).toBe('Hello World!');
        });
    });

    describe('health', () => {
        it('should return { status: "ok" }', () => {
            expect(controller.health()).toEqual({ status: 'ok' });
        });
    });

    describe('newRedirect', () => {
        const res = { redirect: jest.fn() } as unknown as Response;

        it('should redirect if QR and guest with media exist', async () => {
            const qr = { id: 1, guestId: 1 };
            const guest = { id: 1, customMediaUrl: 'http://example.com' };

            (qrCodesService.findOneByNumericId as jest.Mock).mockResolvedValue(
                qr,
            );
            (guestsService.findOne as jest.Mock).mockResolvedValue(guest);

            await controller.newRedirect(1, 1, res);

            expect(res.redirect).toHaveBeenCalledWith('http://example.com');
        });

        it('should throw NotFoundException if QR code not found', async () => {
            (qrCodesService.findOneByNumericId as jest.Mock).mockResolvedValue(
                null,
            );
            await expect(controller.newRedirect(1, 1, res)).rejects.toThrow(
                NotFoundException,
            );
        });

        it('should throw NotFoundException if guest has no media', async () => {
            const qr = { id: 1, guestId: 1 };
            const guest = { id: 1, customMediaUrl: null };

            (qrCodesService.findOneByNumericId as jest.Mock).mockResolvedValue(
                qr,
            );
            (guestsService.findOne as jest.Mock).mockResolvedValue(guest);

            await expect(controller.newRedirect(1, 1, res)).rejects.toThrow(
                NotFoundException,
            );
        });
    });

    describe('qrRedirect', () => {
        const res = { redirect: jest.fn() } as unknown as Response;

        it('should redirect if all params valid', async () => {
            const qr = { id: 1, guestId: 1, eventId: 1 };
            const guest = { id: 1, customMediaUrl: 'http://example.com' };

            (qrCodesService.findOne as jest.Mock).mockResolvedValue(qr);
            (guestsService.findOne as jest.Mock).mockResolvedValue(guest);

            await controller.qrRedirect('1', '1', 'id-1', res);

            expect(res.redirect).toHaveBeenCalledWith('http://example.com');
        });

        it('should throw BadRequestException if missing params', async () => {
            await expect(
                controller.qrRedirect('', '', '', res),
            ).rejects.toThrow(BadRequestException);
        });

        it('should throw NotFoundException if QR not found', async () => {
            (qrCodesService.findOne as jest.Mock).mockResolvedValue(null);
            await expect(
                controller.qrRedirect('1', '1', 'i1', res),
            ).rejects.toThrow(NotFoundException);
        });

        it('should throw BadRequestException if QR eventId mismatch', async () => {
            const qr = { id: 1, eventId: 2 };
            (qrCodesService.findOne as jest.Mock).mockResolvedValue(qr);
            await expect(
                controller.qrRedirect('1', '1', 'id-1', res),
            ).rejects.toThrow(BadRequestException);
        });
    });
});
