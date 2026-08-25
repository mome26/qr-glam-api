import { Test, TestingModule } from '@nestjs/testing';
import { QrCodesController } from '../qr-codes.controller';
import { QrCodesService } from '../qr-codes.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { QrCode } from '../entities/qr-code.entity';
import { Event } from '../../events/entities/event.entity';
import { EventsService } from '../../events/events.service';
import { Guest } from '../../guests/entities/guest.entity';
import { TemplateCacheService } from '../services/template-cache.service';

/**
 * T019 & T020: Scan page preview endpoint tests
 *
 * Tests that POST /events/:eventId/scan-page/preview correctly:
 * - Renders custom Handlebars template with first guest data (T019)
 * - Handles event with no guests using placeholder fallback (T020)
 */
describe('Scan Page Preview Endpoint (T019, T020)', () => {
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
            type: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };
        return res;
    };

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

    describe('POST /events/:eventId/scan-page/preview', () => {
        it('[T019] should render custom template with first guest data', async () => {
            // Arrange
            const driveFileInfo = {
                fileId: 'file123',
                fileName: 'alice-media.mp4',
                mimeType: 'video/mp4',
                fileSize: 50000000,
                embedUrl: 'https://drive.google.com/file/d/file123/preview',
                streamUrl: null,
                downloadUrl:
                    'https://drive.google.com/uc?export=download&id=file123',
                thumbnailUrl: null,
            };
            mockEventsService.findByIdentifier.mockResolvedValue({
                id: 1,
                name: 'Test Event',
            });
            mockQrCodeRepo.findOne.mockResolvedValue({
                id: 1,
                eventId: 1,
                guest: { id: 1, name: 'Alice', customMediaUrl: null },
                event: { id: 1, name: 'Test Event' },
            });
            mockService.resolveGuestMediaUrl.mockResolvedValue(driveFileInfo);
            const res = makeMockResponse();

            // Act
            await controller.previewScanPage(
                '1',
                { template: '<html>{{guestName}} - {{eventName}}</html>' },
                res,
            );

            // Assert
            expect(res.type).toHaveBeenCalledWith('text/html');
            const sentHtml = res.send.mock.calls[0][0];
            expect(sentHtml).toContain('Alice');
            expect(sentHtml).toContain('Test Event');
        });

        it('[T020] should handle event with no guests (placeholder fallback)', async () => {
            // Arrange
            mockEventsService.findByIdentifier.mockResolvedValue({
                id: 2,
                name: 'Empty Event',
            });
            mockQrCodeRepo.findOne.mockResolvedValue(null);
            const res = makeMockResponse();

            // Act
            await controller.previewScanPage(
                '2',
                { template: '<html>{{eventName}} - Preview</html>' },
                res,
            );

            // Assert
            expect(res.type).toHaveBeenCalledWith('text/html');
            const sentHtml = res.send.mock.calls[0][0];
            expect(sentHtml).toContain('Empty Event');
        });
    });
});
