import { Test, TestingModule } from '@nestjs/testing';
import { QrCodesController } from '../qr-codes.controller';
import { QrCodesService } from '../qr-codes.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { QrCode } from '../entities/qr-code.entity';
import { Event } from '../../events/entities/event.entity';
import { EventsService } from '../../events/events.service';
import { Guest } from '../../guests/entities/guest.entity';
import * as handlebars from 'handlebars';
import { TemplateCacheService } from '../services/template-cache.service';

/**
 * T008: Custom scan page template rendering via Handlebars
 * T009: Fallback to default template on Handlebars syntax error
 */
describe('Custom Scan Page Template (T008, T009)', () => {
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

    describe('[T008] Custom scanPageTemplate rendering', () => {
        it('should compile custom template with Handlebars and call res.send(html)', async () => {
            // Arrange
            const templateStr = '<html><body>Hello {{guestName}}</body></html>';
            const placeholderUrl =
                'https://via.placeholder.com/800x600?text=QR+Media+Not+Available';

            const eventUuid = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
            const event = {
                id: 1,
                name: 'Custom Template Event',
                scanPageTemplate: templateStr,
            };

            const qrCode = {
                id: 1,
                eventId: 1,
                redirectLink: null,
                customMediaUrl: null,
                guest: { id: 1, name: 'Alice', customMediaUrl: null },
                event,
            };

            mockEventsService.findByIdentifier.mockResolvedValue(event);
            mockQrCodeRepo.findOne.mockResolvedValue(qrCode);
            mockService.resolveGuestMediaUrl.mockResolvedValue(placeholderUrl);

            // Mock getCompiledTemplate to return a real compiled Handlebars function
            const compiledFn = handlebars.compile(templateStr);
            mockService.getCompiledTemplate.mockReturnValue(compiledFn);

            const res = makeMockResponse();

            // Act
            await controller.scanQrCode(eventUuid, 1, res, mockReq as any);

            // Assert — res.send called with compiled HTML containing 'Hello Alice'
            expect(mockService.getCompiledTemplate).toHaveBeenCalledWith(
                1,
                templateStr,
            );
            expect(res.send).toHaveBeenCalledWith(
                expect.stringContaining('Hello Alice'),
            );
            // res.render should NOT be called when custom template succeeds
            expect(res.render).not.toHaveBeenCalled();
        });
    });

    describe('[T009] Fallback on Handlebars syntax error', () => {
        it('should fallback to res.render(qr-scan-page) when custom template has syntax error', async () => {
            // Arrange
            const invalidTemplate = '{{#if unclosed';
            const placeholderUrl =
                'https://via.placeholder.com/800x600?text=QR+Media+Not+Available';

            const eventUuid = 'b1ffcd00-ad1c-5ff9-cc7e-7cc0ce491b22';
            const event = {
                id: 2,
                name: 'Bad Template Event',
                scanPageTemplate: invalidTemplate,
            };

            const qrCode = {
                id: 2,
                eventId: 2,
                redirectLink: null,
                customMediaUrl: null,
                guest: { id: 2, name: 'Bob', customMediaUrl: null },
                event,
            };

            mockEventsService.findByIdentifier.mockResolvedValue(event);
            mockQrCodeRepo.findOne.mockResolvedValue(qrCode);
            mockService.resolveGuestMediaUrl.mockResolvedValue(placeholderUrl);

            // Mock getCompiledTemplate to throw (simulating Handlebars parse error)
            mockService.getCompiledTemplate.mockImplementation(() => {
                throw new Error("Parse error: Expecting 'ID', got 'EOF'");
            });

            const res = makeMockResponse();

            // Act
            await controller.scanQrCode(eventUuid, 2, res, mockReq as any);

            // Assert — should fallback to default template rendering
            expect(res.render).toHaveBeenCalledWith(
                'qr-scan-page',
                expect.objectContaining({
                    eventName: 'Bad Template Event',
                    guestName: 'Bob',
                }),
            );
            // res.send should NOT be called (custom template failed)
            expect(res.send).not.toHaveBeenCalled();
        });
    });
});
