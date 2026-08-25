import { Test, TestingModule } from '@nestjs/testing';
import { QrCodesController } from '../qr-codes.controller';
import { QrCodesService } from '../qr-codes.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { QrCode } from '../entities/qr-code.entity';
import { Event } from '../../events/entities/event.entity';
import { EventsService } from '../../events/events.service';
import { Guest } from '../../guests/entities/guest.entity';
import { UrlStrategy } from '../../events/enums/url-strategy.enum';
import { TemplateCacheService } from '../services/template-cache.service';

/**
 * T088: QR scan page rendering verification
 *
 * Tests that GET /e/:eventId/qr/:qrId correctly:
 * - Returns 302 redirect when redirectLink is present
 * - Returns 302 redirect when customMediaUrl is present (QrCode entity)
 * - Returns 302 redirect when guest.customMediaUrl is present
 * - Calls res.render('qr-scan-page', ...) with correct template data for
 *   the HTML page (media/placeholder fallback)
 * - Returns 404 for unknown QR code
 *
 * Note: Full browser E2E (visual rendering) requires a running server.
 * This test verifies the controller logic for all scan outcomes.
 */
describe('QR Scan Page Endpoint (T088)', () => {
    let controller: QrCodesController;
    let mockQrCodeRepo: any;
    let mockEventRepo: any;
    let mockService: any;
    let mockEventsService: any;

    const makeMockResponse = () => {
        const res: any = {
            redirect: jest.fn(),
            render: jest.fn(),
            status: jest.fn().mockReturnThis(),
            send: jest.fn(),
        };
        return res;
    };

    const mockReq = { user: null };

    // Helper to create a properly structured mock event with all required fields
    const makeMockEvent = (overrides = {}) => ({
        id: 1,
        name: 'My Event',
        slug: 'my-event',
        urlStrategy: UrlStrategy.PURE_SLUG,
        urlHash: 'uuid-v7-hash',
        requireAuthForQrScan: false,
        scanPageTemplate: null,
        ...overrides,
    });

    // Helper to create a properly structured mock QR code
    const makeMockQrCode = (overrides = {}) => ({
        id: 1,
        numericId: 1,
        eventId: 1,
        redirectLink: null,
        customMediaUrl: null,
        guest: null,
        event: null,
        ...overrides,
    });

    beforeEach(async () => {
        mockQrCodeRepo = {
            findOne: jest.fn(),
        };

        mockEventRepo = {
            findOne: jest.fn(),
        };

        mockService = {
            resolveGuestMediaUrl: jest.fn(),
            getQrCodesByEvent: jest.fn(),
            getTemplatesByEvent: jest.fn(),
            createTemplate: jest.fn(),
            updateTemplate: jest.fn(),
            deleteTemplate: jest.fn(),
            setEventDefaultTemplate: jest.fn(),
            findOneByNumericId: jest.fn(),
            findOne: jest.fn(),
            getCompiledTemplate: jest.fn(),
        };

        mockEventsService = {
            findByIdentifier: jest.fn(),
            buildQrUrlWithRedirect: jest.fn().mockReturnValue({
                targetUrl: 'current-url',
                needsRedirect: false,
            }),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [QrCodesController],
            providers: [
                { provide: QrCodesService, useValue: mockService },
                { provide: EventsService, useValue: mockEventsService },
                {
                    provide: getRepositoryToken(QrCode),
                    useValue: mockQrCodeRepo,
                },
                { provide: getRepositoryToken(Event), useValue: mockEventRepo },
                {
                    provide: getRepositoryToken(Guest),
                    useValue: { update: jest.fn() },
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

    describe('GET /e/:eventId/qr/:qrId — QR Scan Page', () => {
        it('should return 404 when QR code not found', async () => {
            // Arrange
            mockEventsService.findByIdentifier.mockResolvedValue(
                makeMockEvent(),
            );
            mockQrCodeRepo.findOne.mockResolvedValue(null);
            const res = makeMockResponse();

            // Act
            await controller.scanQrCode('my-event', 999, res, mockReq as any);

            // Assert
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.send).toHaveBeenCalledWith('QR code not found');
        });

        it('should redirect 302 when redirectLink is set (highest priority)', async () => {
            // Arrange
            const qrCode = makeMockQrCode({
                redirectLink: 'https://redirect.example.com/page',
                guest: { id: 1, name: 'Alice', customMediaUrl: null },
            });
            mockEventsService.findByIdentifier.mockResolvedValue(
                makeMockEvent(),
            );
            mockQrCodeRepo.findOne.mockResolvedValue(qrCode);
            const res = makeMockResponse();

            // Act
            await controller.scanQrCode('my-event', 1, res, mockReq as any);

            // Assert
            expect(res.redirect).toHaveBeenCalledWith(
                302,
                'https://redirect.example.com/page',
            );
        });

        it('should redirect 302 when QrCode.customMediaUrl is set', async () => {
            // Arrange
            const qrCode = makeMockQrCode({
                customMediaUrl: 'https://drive.google.com/file/d/abc123/view',
                guest: { id: 1, name: 'Alice', customMediaUrl: null },
            });
            mockEventsService.findByIdentifier.mockResolvedValue(
                makeMockEvent(),
            );
            mockQrCodeRepo.findOne.mockResolvedValue(qrCode);
            const res = makeMockResponse();

            // Act
            await controller.scanQrCode('my-event', 1, res, mockReq as any);

            // Assert — QrCode.customMediaUrl takes priority over guest.customMediaUrl
            expect(res.redirect).toHaveBeenCalledWith(
                302,
                'https://drive.google.com/file/d/abc123/view',
            );
        });

        it('should redirect 302 when guest.customMediaUrl is set (fallback)', async () => {
            // Arrange
            const qrCode = makeMockQrCode({
                guest: {
                    id: 1,
                    name: 'Alice',
                    customMediaUrl: 'https://r2.example.com/guest-media.jpg',
                },
            });
            mockEventsService.findByIdentifier.mockResolvedValue(
                makeMockEvent(),
            );
            mockQrCodeRepo.findOne.mockResolvedValue(qrCode);
            const res = makeMockResponse();

            // Act
            await controller.scanQrCode('my-event', 1, res, mockReq as any);

            // Assert
            expect(res.redirect).toHaveBeenCalledWith(
                302,
                'https://r2.example.com/guest-media.jpg',
            );
        });

        it('should render qr-scan-page template when no media URL set', async () => {
            // Arrange
            const placeholderUrl =
                'https://via.placeholder.com/800x600?text=QR+Media+Not+Available';
            const qrCode = makeMockQrCode({
                numericId: 1,
                guest: {
                    id: 1,
                    name: 'Alice',
                    customMediaUrl: null,
                    scannedAt: null,
                },
            });
            mockEventsService.findByIdentifier.mockResolvedValue(
                makeMockEvent({ name: 'Summer Wedding 2026' }),
            );
            mockQrCodeRepo.findOne.mockResolvedValue(qrCode);
            mockService.resolveGuestMediaUrl.mockResolvedValue({
                downloadUrl: placeholderUrl,
                embedUrl: null,
                thumbnailUrl: null,
                mimeType: null,
                fileId: null,
            });
            const res = makeMockResponse();

            // Act
            await controller.scanQrCode('my-event', 1, res, mockReq as any);

            // Assert — server renders HTML template with event/guest context
            expect(res.render).toHaveBeenCalledWith(
                'qr-scan-page',
                expect.objectContaining({
                    eventName: 'Summer Wedding 2026',
                    guestName: 'Alice',
                    mediaUrl: placeholderUrl,
                }),
            );
        });

        it('should render placeholder page when event has no media', async () => {
            // Arrange
            const placeholderUrl =
                'https://via.placeholder.com/800x600?text=QR+Media+Not+Available';
            const qrCode = makeMockQrCode({
                numericId: 2,
                guest: {
                    id: 2,
                    name: null,
                    customMediaUrl: null,
                    scannedAt: null,
                },
            });
            mockEventsService.findByIdentifier.mockResolvedValue(
                makeMockEvent({ name: 'Corporate Conference' }),
            );
            mockQrCodeRepo.findOne.mockResolvedValue(qrCode);
            mockService.resolveGuestMediaUrl.mockResolvedValue({
                downloadUrl: placeholderUrl,
                embedUrl: null,
                thumbnailUrl: null,
                mimeType: null,
                fileId: null,
            });
            const res = makeMockResponse();

            // Act
            await controller.scanQrCode('my-event', 2, res, mockReq as any);

            // Assert — guestName is null/falsy, template handles gracefully
            expect(res.render).toHaveBeenCalledWith(
                'qr-scan-page',
                expect.objectContaining({
                    eventName: 'Corporate Conference',
                    guestName: null,
                    mediaUrl: placeholderUrl,
                }),
            );
        });

        it('should detect video media and set isVideo flag', async () => {
            // Arrange
            const videoFileInfo = {
                fileId: 'vid789',
                fileName: 'guest-video.mp4',
                mimeType: 'video/mp4',
                fileSize: 75000000,
                embedUrl: 'https://drive.google.com/file/d/vid789/preview',
                streamUrl: 'https://drive.google.com/uc?export=view&id=vid789',
                downloadUrl:
                    'https://drive.google.com/uc?export=download&id=vid789',
                thumbnailUrl: 'https://lh3.googleusercontent.com/d/vid789',
            };
            const qrCode = makeMockQrCode({
                numericId: 3,
                guest: {
                    id: 3,
                    name: 'Bob',
                    customMediaUrl: null,
                    scannedAt: null,
                },
            });
            mockEventsService.findByIdentifier.mockResolvedValue(
                makeMockEvent({ name: 'Film Festival' }),
            );
            mockQrCodeRepo.findOne.mockResolvedValue(qrCode);
            mockService.resolveGuestMediaUrl.mockResolvedValue(videoFileInfo);
            const res = makeMockResponse();

            // Act
            await controller.scanQrCode('my-event', 3, res, mockReq as any);

            // Assert — isVideo should be true for video/* mimeType
            expect(res.render).toHaveBeenCalledWith(
                'qr-scan-page',
                expect.objectContaining({
                    isVideo: true,
                    embedUrl: videoFileInfo.embedUrl,
                    downloadUrl: videoFileInfo.downloadUrl,
                    thumbnailUrl: videoFileInfo.thumbnailUrl,
                }),
            );
        });

        it('should use event name fallback when event is missing', async () => {
            // Arrange
            const placeholderUrl =
                'https://via.placeholder.com/800x600?text=QR+Media+Not+Available';
            const qrCode = makeMockQrCode({
                numericId: 4,
                guest: {
                    id: 4,
                    name: 'Carol',
                    customMediaUrl: null,
                    scannedAt: null,
                },
            });
            mockEventsService.findByIdentifier.mockResolvedValue(
                makeMockEvent({ name: null }),
            );
            mockQrCodeRepo.findOne.mockResolvedValue(qrCode);
            mockService.resolveGuestMediaUrl.mockResolvedValue({
                downloadUrl: placeholderUrl,
                embedUrl: null,
                thumbnailUrl: null,
                mimeType: null,
                fileId: null,
            });
            const res = makeMockResponse();

            // Act
            await controller.scanQrCode('my-event', 4, res, mockReq as any);

            // Assert — falls back to 'Event' when event is null
            expect(res.render).toHaveBeenCalledWith(
                'qr-scan-page',
                expect.objectContaining({
                    eventName: 'Event',
                }),
            );
        });

        it('should return 403 when guest status is Denied', async () => {
            // Arrange
            const qrCode = makeMockQrCode({
                numericId: 5,
                guest: {
                    id: 5,
                    name: 'Dave',
                    status: 'Denied',
                    customMediaUrl: null,
                    scannedAt: null,
                },
            });
            mockEventsService.findByIdentifier.mockResolvedValue(
                makeMockEvent(),
            );
            mockQrCodeRepo.findOne.mockResolvedValue(qrCode);
            const res = makeMockResponse();

            // Act
            await controller.scanQrCode('my-event', 5, res, mockReq as any);

            // Assert
            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.send).toHaveBeenCalledWith('Guest Denied');
        });

        it('[T008] should pass embedUrl, isVideo, downloadUrl to template for video files', async () => {
            // Arrange
            const driveFileInfo = {
                fileId: 'abc123',
                fileName: 'guest-video.mp4',
                mimeType: 'video/mp4',
                fileSize: 50000000,
                embedUrl: 'https://drive.google.com/file/d/abc123/preview',
                streamUrl: 'https://drive.google.com/uc?export=view&id=abc123',
                downloadUrl:
                    'https://drive.google.com/uc?export=download&id=abc123',
                thumbnailUrl: 'https://lh3.googleusercontent.com/d/abc123',
            };
            const qrCode = makeMockQrCode({
                numericId: 6,
                guest: {
                    id: 6,
                    name: 'Eve',
                    customMediaUrl: null,
                    scannedAt: null,
                },
            });
            mockEventsService.findByIdentifier.mockResolvedValue(
                makeMockEvent({ name: 'Video Event' }),
            );
            mockQrCodeRepo.findOne.mockResolvedValue(qrCode);
            mockService.resolveGuestMediaUrl.mockResolvedValue(driveFileInfo);
            const res = makeMockResponse();

            // Act
            await controller.scanQrCode('my-event', 6, res, mockReq as any);

            // Assert
            expect(res.render).toHaveBeenCalledWith(
                'qr-scan-page',
                expect.objectContaining({
                    embedUrl: driveFileInfo.embedUrl,
                    isVideo: true,
                    downloadUrl: driveFileInfo.downloadUrl,
                    thumbnailUrl: driveFileInfo.thumbnailUrl,
                    guestName: 'Eve',
                }),
            );
        });

        it('[T009] should set embedUrl=null, isVideo=false for image files', async () => {
            // Arrange
            const driveFileInfo = {
                fileId: 'img456',
                fileName: 'guest-photo.jpg',
                mimeType: 'image/jpeg',
                fileSize: 2000000,
                embedUrl: null,
                streamUrl: null,
                downloadUrl:
                    'https://drive.google.com/uc?export=download&id=img456',
                thumbnailUrl: null,
            };
            const qrCode = makeMockQrCode({
                numericId: 7,
                guest: {
                    id: 7,
                    name: 'Frank',
                    customMediaUrl: null,
                    scannedAt: null,
                },
            });
            mockEventsService.findByIdentifier.mockResolvedValue(
                makeMockEvent({ name: 'Photo Event' }),
            );
            mockQrCodeRepo.findOne.mockResolvedValue(qrCode);
            mockService.resolveGuestMediaUrl.mockResolvedValue(driveFileInfo);
            const res = makeMockResponse();

            // Act
            await controller.scanQrCode('my-event', 7, res, mockReq as any);

            // Assert
            expect(res.render).toHaveBeenCalledWith(
                'qr-scan-page',
                expect.objectContaining({
                    embedUrl: null,
                    isVideo: false,
                    downloadUrl: driveFileInfo.downloadUrl,
                    guestName: 'Frank',
                }),
            );
        });
    });
});
