import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QrCodesController } from '../qr-codes.controller';
import { QrCodesService } from '../qr-codes.service';
import { EventsService } from '../../events/events.service';
import { QrCode } from '../entities/qr-code.entity';
import { Event } from '../../events/entities/event.entity';
import { UrlStrategy } from '../../events/enums/url-strategy.enum';
import { Guest } from '../../guests/entities/guest.entity';
import { TemplateCacheService } from '../services/template-cache.service';

/**
 * T085: First-scan recording verification
 *
 * Tests that the QR scan endpoint correctly:
 * - Sets guest.scannedAt on first scan
 * - Does NOT overwrite scannedAt on subsequent scans (idempotent)
 * - Continues to serve the QR page even if scan recording fails
 */
describe('QR Scan Tracking (T085)', () => {
    let controller: QrCodesController;
    let mockQrCodeRepo: jest.Mocked<Repository<QrCode>>;
    let mockGuestRepo: jest.Mocked<Repository<Guest>>;
    let mockQrCodesService: jest.Mocked<QrCodesService>;
    let mockEventsService: jest.Mocked<EventsService>;

    const mockEvent: Partial<Event> = {
        id: 1,
        name: 'Test Event',
        slug: 'test-event',
        urlStrategy: UrlStrategy.PURE_SLUG,
        urlHash: 'uuid-hash',
        requireAuthForQrScan: false,
        scanPageTemplate: null,
        registeredAttendees: 0,
    };

    const mockGuest = {
        id: 10,
        name: 'Test Guest',
        email: 'test@example.com',
        status: 'Pending' as const,
        scannedAt: null as Date | null,
        eventId: 1,
    };

    const mockQrCode: Partial<QrCode> = {
        id: 1,
        numericId: 1,
        eventId: 1,
        guestId: 10,
        redirectLink: null,
        customMediaUrl: null,
        guest: mockGuest as any,
    };

    const mockRes = () => {
        const res: any = {};
        res.status = jest.fn().mockReturnValue(res);
        res.send = jest.fn().mockReturnValue(res);
        res.render = jest.fn().mockReturnValue(res);
        res.redirect = jest.fn().mockReturnValue(res);
        return res;
    };

    const placeholderUrl =
        'https://via.placeholder.com/800x600?text=QR+Media+Not+Available';

    // Mock media info object (DriveFileInfoDto shape)
    const mockMediaInfo = {
        fileId: null,
        fileName: null,
        mimeType: null,
        fileSize: null,
        embedUrl: null,
        streamUrl: null,
        downloadUrl: placeholderUrl,
        thumbnailUrl: null,
    };

    beforeEach(async () => {
        mockQrCodeRepo = {
            findOne: jest.fn(),
        } as any;

        mockGuestRepo = {
            update: jest.fn(),
        } as any;

        mockQrCodesService = {
            findOneByNumericId: jest.fn(),
            resolveGuestMediaUrl: jest.fn().mockResolvedValue(null),
            getCompiledTemplate: jest.fn(),
        } as any;

        mockEventsService = {
            findByIdentifier: jest.fn().mockResolvedValue(mockEvent),
            buildQrUrlWithRedirect: jest.fn().mockReturnValue({
                targetUrl: '',
                needsRedirect: false,
            }),
        } as any;

        const module: TestingModule = await Test.createTestingModule({
            controllers: [QrCodesController],
            providers: [
                {
                    provide: QrCodesService,
                    useValue: mockQrCodesService,
                },
                {
                    provide: EventsService,
                    useValue: mockEventsService,
                },
                {
                    provide: getRepositoryToken(QrCode),
                    useValue: mockQrCodeRepo,
                },
                {
                    provide: getRepositoryToken(Event),
                    useValue: {},
                },
                {
                    provide: getRepositoryToken(Guest),
                    useValue: mockGuestRepo,
                },
                {
                    provide: TemplateCacheService,
                    useValue: {
                        getAll: jest.fn().mockReturnValue([]),
                        getById: jest.fn(),
                    },
                },
            ],
        }).compile();

        controller = module.get<QrCodesController>(QrCodesController);
    });

    describe('GET /e/:eventIdentifier/qr/:qrId — Scan Recording', () => {
        it('should set scannedAt on first scan when guest.scannedAt is null', async () => {
            const guestWithNullScannedAt = { ...mockGuest, scannedAt: null };
            mockQrCodeRepo.findOne.mockResolvedValue({
                ...mockQrCode,
                guest: guestWithNullScannedAt,
            } as QrCode);
            mockQrCodesService.resolveGuestMediaUrl.mockResolvedValue(
                mockMediaInfo,
            );

            const res = mockRes();
            await controller.scanQrCode('test-event', 1, res, {});

            expect(mockGuestRepo.update).toHaveBeenCalledWith(10, {
                scannedAt: expect.any(Date),
            });
        });

        it('should NOT overwrite scannedAt on subsequent scans', async () => {
            const guestWithScannedAt = {
                ...mockGuest,
                scannedAt: new Date('2024-01-01T00:00:00.000Z'),
            };
            mockQrCodeRepo.findOne.mockResolvedValue({
                ...mockQrCode,
                guest: guestWithScannedAt,
            } as QrCode);
            mockQrCodesService.resolveGuestMediaUrl.mockResolvedValue(
                mockMediaInfo,
            );

            const res = mockRes();
            await controller.scanQrCode('test-event', 1, res, {});

            // scannedAt update should NOT be called (already scanned)
            // but markGuestComplete (status: 'Complete') IS called — that's expected
            const updateCalls = mockGuestRepo.update.mock.calls;
            const scannedAtCalls = updateCalls.filter(
                (call) => call[1] && 'scannedAt' in call[1],
            );
            expect(scannedAtCalls).toHaveLength(0);
        });

        it('should still render QR page even if scan recording fails', async () => {
            mockGuestRepo.update.mockRejectedValue(
                new Error('Database connection lost'),
            );
            mockQrCodeRepo.findOne.mockResolvedValue({
                ...mockQrCode,
                guest: { ...mockGuest, scannedAt: null },
            } as QrCode);
            mockQrCodesService.resolveGuestMediaUrl.mockResolvedValue(
                mockMediaInfo,
            );

            const res = mockRes();
            await controller.scanQrCode('test-event', 1, res, {});

            // Should still render the page (not return 500)
            expect(res.render).toHaveBeenCalledWith('qr-scan-page', {
                eventName: 'Test Event',
                guestName: 'Test Guest',
                mediaUrl: placeholderUrl,
                embedUrl: null,
                downloadUrl: placeholderUrl,
                isVideo: false,
                thumbnailUrl: null,
                driveViewUrl: null,
                year: 2026,
            });
        });

        it('should handle guest without qrCode relation gracefully', async () => {
            mockQrCodeRepo.findOne.mockResolvedValue({
                ...mockQrCode,
                guest: null,
            } as QrCode);
            // No media info available for null guest
            mockQrCodesService.resolveGuestMediaUrl.mockResolvedValue(null);

            const res = mockRes();
            await controller.scanQrCode('test-event', 1, res, {});

            // Should not throw, still render the page with fallbacks
            expect(res.render).toHaveBeenCalledWith('qr-scan-page', {
                eventName: 'Test Event',
                guestName: null,
                mediaUrl: null,
                embedUrl: null,
                downloadUrl: null,
                isVideo: false,
                thumbnailUrl: null,
                driveViewUrl: null,
                year: 2026,
            });
        });
    });
});
