import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { QrCodesController } from '../qr-codes.controller';
import { QrCodesService } from '../qr-codes.service';
import { EventsService } from '../../events/events.service';
import { CreateQrTemplateDto } from '../dto/create-qr-template.dto';
import { UpdateQrTemplateDto } from '../dto/update-qr-template.dto';

import { QrCodeQueryDto } from '../dto/qr-code-query.dto';
import { getRepositoryToken } from '@nestjs/typeorm';
import { QrCode } from '../entities/qr-code.entity';
import { Event } from '../../events/entities/event.entity';
import { Guest } from '../../guests/entities/guest.entity';

describe('QrCodesController (comprehensive)', () => {
    let controller: QrCodesController;
    let service: any;
    let eventsService: any;

    beforeEach(async () => {
        service = {
            findOne: jest.fn(),
            getQrCodesByEvent: jest.fn(),
            getTemplatesByEvent: jest.fn(),
            createTemplate: jest.fn(),
            updateTemplate: jest.fn(),
            deleteTemplate: jest.fn(),
            findOneByNumericId: jest.fn(),
            setEventDefaultTemplate: jest.fn(),
            getTemplateById: jest.fn(),
            duplicateTemplate: jest.fn(),
            bulkUpdate: jest.fn(),
            bulkDownloadQr: jest.fn(),
            getAvailableTemplates: jest.fn(),
            getTemplateContent: jest.fn(),
        };

        eventsService = {
            findByIdentifier: jest.fn().mockResolvedValue({ id: 1 }),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [QrCodesController],
            providers: [
                {
                    provide: QrCodesService,
                    useValue: service,
                },
                {
                    provide: EventsService,
                    useValue: eventsService,
                },
                {
                    provide: getRepositoryToken(QrCode),
                    useValue: {
                        findOne: jest.fn(),
                    },
                },
                {
                    provide: getRepositoryToken(Event),
                    useValue: {
                        findOne: jest.fn(),
                    },
                },
                {
                    provide: getRepositoryToken(Guest),
                    useValue: {
                        update: jest.fn(),
                    },
                },
            ],
        }).compile();

        controller = module.get<QrCodesController>(QrCodesController);
    });

    describe('GET /events/:eventId/qr-codes (list)', () => {
        it('should return paginated QR codes', async () => {
            const query: QrCodeQueryDto = {
                page: 1,
                limit: 10,
            };

            const response = {
                data: [
                    {
                        id: 1,
                        numericId: 1,
                        eventId: 1,
                        guest: { name: 'Alice' },
                    },
                ],
                total: 1,
                page: 1,
                limit: 10,
                totalPages: 1,
            };

            service.getQrCodesByEvent.mockResolvedValue(response);

            const result = await controller.getQrCodes('1', query);

            expect(result).toEqual(response);
            expect(service.getQrCodesByEvent).toHaveBeenCalledWith(1, query);
        });
    });

    describe('POST /events/:eventId/templates (create)', () => {
        it('should create a template', async () => {
            const dto: CreateQrTemplateDto = {
                name: 'My Template',
                backgroundImage: 'bg.jpg',
                qrPositionX: 100,
                qrPositionY: 100,
                qrSize: 200,
            };

            service.createTemplate.mockResolvedValue({ id: 1, ...dto });

            const result = await controller.createTemplate('1', dto);

            expect(result.id).toBe(1);
            expect(service.createTemplate).toHaveBeenCalledWith(1, dto);
        });
    });

    describe('PATCH /events/:eventId/templates/:id (update)', () => {
        it('should update a template', async () => {
            const dto: UpdateQrTemplateDto = { name: 'Updated' };
            service.updateTemplate.mockResolvedValue({ id: 1, ...dto });

            const result = await controller.updateTemplate('1', 1, dto);

            expect(result.name).toBe('Updated');
            expect(service.updateTemplate).toHaveBeenCalledWith(1, dto);
        });
    });

    describe('DELETE /events/:eventId/templates/:id', () => {
        it('should delete a template', async () => {
            service.deleteTemplate.mockResolvedValue(undefined);

            await controller.deleteTemplate('1', 1);

            expect(service.deleteTemplate).toHaveBeenCalledWith(1);
        });
    });

    describe('POST /events/:eventId/templates/:id/duplicate', () => {
        it('should duplicate a template', async () => {
            service.duplicateTemplate.mockResolvedValue({ id: 2 });

            const result = await controller.duplicateTemplate('1', 1);

            expect(result.id).toBe(2);
            expect(service.duplicateTemplate).toHaveBeenCalledWith(1, 1);
        });
    });

    describe('PATCH /events/:eventId/default-template', () => {
        it('should set default template', async () => {
            service.setEventDefaultTemplate.mockResolvedValue({ id: 1 });

            await controller.setDefaultTemplate('1', 1);

            expect(service.setEventDefaultTemplate).toHaveBeenCalledWith(1, 1);
        });
    });

    describe('POST /events/:eventId/qr-codes/bulk-update', () => {
        it('should bulk update QR codes', async () => {
            service.bulkUpdate.mockResolvedValue({ success: true });

            await controller.bulkUpdate('1', {
                qrCodeIds: [1],
                templateId: 2,
            });

            expect(service.bulkUpdate).toHaveBeenCalledWith(1, {
                qrCodeIds: [1],
                templateId: 2,
            });
        });
    });

    describe('GET /events/:eventId/scan-page/templates', () => {
        it('should return list of templates', async () => {
            const templates = [
                { id: 'qr-scan-page', label: 'Default', language: 'en' },
                { id: 'vi/art-deco.vi', label: 'Art Deco', language: 'vi' },
            ];
            service.getAvailableTemplates.mockResolvedValue(templates);

            const result = await controller.getScanPageTemplates('1');

            expect(result).toEqual(templates);
            expect(service.getAvailableTemplates).toHaveBeenCalled();
            expect(eventsService.findByIdentifier).toHaveBeenCalledWith('1');
        });

        it('should throw if event not found', async () => {
            eventsService.findByIdentifier.mockRejectedValue(
                new NotFoundException('Event not found'),
            );

            await expect(
                controller.getScanPageTemplates('invalid'),
            ).rejects.toThrow(NotFoundException);
        });
    });

    describe('GET /events/:eventId/scan-page/templates/:id/content', () => {
        it('should return template content as text', async () => {
            const mockContent = '<html>default template</html>';
            service.getTemplateContent.mockResolvedValue(mockContent);

            const mockRes = {
                type: jest.fn().mockReturnThis(),
                send: jest.fn(),
            } as any;

            await controller.getScanPageTemplateContent(
                '1',
                'qr-scan-page',
                mockRes,
            );

            expect(service.getTemplateContent).toHaveBeenCalledWith(
                'qr-scan-page',
            );
            expect(mockRes.type).toHaveBeenCalledWith('text/plain');
            expect(mockRes.send).toHaveBeenCalledWith(mockContent);
        });

        it('should throw 404 on missing template', async () => {
            service.getTemplateContent.mockRejectedValue(
                new NotFoundException('Template not found'),
            );

            const mockRes = {
                type: jest.fn().mockReturnThis(),
                send: jest.fn(),
            } as any;

            await expect(
                controller.getScanPageTemplateContent(
                    '1',
                    'nonexistent',
                    mockRes,
                ),
            ).rejects.toThrow(NotFoundException);
        });
    });
});
