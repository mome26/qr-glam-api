import { Test, TestingModule } from '@nestjs/testing';
import { QrCodesService } from '../qr-codes.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { QrCode } from '../entities/qr-code.entity';
import { QrTemplate } from '../entities/qr-template.entity';
import { Event } from '../../events/entities/event.entity';
import { DataSource } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { GoogleDriveProvider } from '../../storage/providers/google-drive.provider';
import { EventsService } from '../../events/events.service';
import { TemplateCacheService } from '../services/template-cache.service';

jest.mock('fs', () => ({
    ...jest.requireActual('fs'),
    existsSync: jest.fn(),
    readdirSync: jest.fn(),
    readFileSync: jest.fn(),
}));

jest.mock('archiver', () => {
    const m = jest.fn(() => ({
        pipe: jest.fn(),
        append: jest.fn(),
        finalize: jest.fn().mockResolvedValue(true),
        on: jest.fn(),
    }));
    return m;
});

describe('QrCodesService', () => {
    let service: QrCodesService;
    let module: TestingModule;
    let qrCodeRepo: any;
    let qrTemplateRepo: any;
    let eventRepo: any;
    let mockGoogleDriveProvider: any;
    let eventsService: any;

    beforeEach(async () => {
        qrCodeRepo = {
            findOne: jest.fn(),
            findAndCount: jest.fn(),
            find: jest.fn(),
            createQueryBuilder: jest.fn(),
            save: jest.fn(),
            create: jest.fn(),
            delete: jest.fn(),
            update: jest.fn(),
        };

        qrTemplateRepo = {
            findOne: jest.fn(),
            findAndCount: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            createQueryBuilder: jest.fn(),
        };

        eventRepo = {
            findOne: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
        };

        mockGoogleDriveProvider = {
            getGuestMediaUrl: jest.fn(),
        };

        eventsService = {
            findByIdentifier: jest.fn(),
            createActivity: jest.fn().mockResolvedValue({ id: 1 }),
        };

        module = await Test.createTestingModule({
            providers: [
                QrCodesService,
                {
                    provide: getRepositoryToken(QrCode),
                    useValue: qrCodeRepo,
                },
                {
                    provide: getRepositoryToken(QrTemplate),
                    useValue: qrTemplateRepo,
                },
                {
                    provide: getRepositoryToken(Event),
                    useValue: eventRepo,
                },
                {
                    provide: GoogleDriveProvider,
                    useValue: mockGoogleDriveProvider,
                },
                {
                    provide: EventsService,
                    useValue: eventsService,
                },
                {
                    provide: DataSource,
                    useValue: {},
                },
                {
                    provide: TemplateCacheService,
                    useValue: {
                        getAll: jest.fn(),
                        getById: jest.fn(),
                    },
                },
            ],
        }).compile();

        service = module.get<QrCodesService>(QrCodesService);
    });

    describe('resolveGuestMediaUrl', () => {
        it(
            'should return customMediaUrl when guest has ' +
                'customMediaUrl (Tier 1)',
            async () => {
                const qrCode = {
                    id: 1,
                    eventId: 1,
                    guestId: 1,
                    numericId: 1,
                    guest: {
                        id: 1,
                        customMediaUrl: 'https://custom.example.com/media.jpg',
                    },
                } as any;

                const result = await service.resolveGuestMediaUrl(qrCode);

                expect(result).toBeDefined();
                expect(result?.downloadUrl).toBe(
                    'https://custom.example.com/media.jpg',
                );
                expect(result?.fileId).toBe('custom');
            },
        );

        it('should fall back to null when no customMediaUrl', async () => {
            const qrCode = {
                id: 1,
                eventId: 1,
                guestId: 1,
                numericId: 1,
                guest: {
                    id: 1,
                },
            } as any;

            const result = await service.resolveGuestMediaUrl(qrCode);

            expect(result).toBeNull();
        });

        it(
            'should use cloud provider when available ' +
                'and no customMediaUrl (Tier 2)',
            async () => {
                const providerData = {
                    fileId: 'abc123',
                    fileName: 'test.mp4',
                    mimeType: 'video/mp4',
                    fileSize: 50000000,
                    embedUrl: 'https://drive.google.com/file/d/abc123/preview',
                    streamUrl:
                        'https://drive.google.com/uc?export=view&id=abc123',
                    downloadUrl:
                        'https://drive.google.com/uc?export=download&id=abc123',
                    thumbnailUrl: 'https://lh3.googleusercontent.com/d/abc123',
                };
                mockGoogleDriveProvider.getGuestMediaUrl.mockResolvedValue(
                    providerData,
                );

                const qrCode = {
                    id: 1,
                    eventId: 1,
                    guestId: 1,
                    numericId: 1,
                    guest: {
                        id: 1,
                    },
                } as any;
                const result = await service.resolveGuestMediaUrl(qrCode, {
                    id: 1,
                    mediaFolderId: 'https://test',
                } as any);

                expect(result).toEqual(providerData);
                expect(
                    mockGoogleDriveProvider.getGuestMediaUrl,
                ).toHaveBeenCalledWith(
                    1,
                    { ...qrCode.guest, numericId: qrCode.numericId },
                    { mediaFolderId: 'https://test' },
                );
            },
        );

        it(
            'should fall back to null when cloud provider fails ' + '(Tier 3)',
            async () => {
                mockGoogleDriveProvider.getGuestMediaUrl.mockRejectedValue(
                    new Error('Provider error'),
                );

                const qrCode = {
                    id: 1,
                    eventId: 1,
                    guestId: 1,
                    numericId: 1,
                    guest: {
                        id: 1,
                    },
                } as any;
                const result = await service.resolveGuestMediaUrl(qrCode, {
                    id: 1,
                    mediaFolderId: 'https://test',
                } as any);

                expect(result).toBeNull();
            },
        );

        it(
            'should fall back to null when cloud provider ' + 'returns null',
            async () => {
                mockGoogleDriveProvider.getGuestMediaUrl.mockResolvedValue(
                    null,
                );

                const qrCode = {
                    id: 1,
                    eventId: 1,
                    guestId: 1,
                    numericId: 1,
                    guest: {
                        id: 1,
                    },
                } as any;
                const result = await service.resolveGuestMediaUrl(qrCode, {
                    id: 1,
                    mediaFolderId: 'https://test',
                } as any);

                expect(result).toBeNull();
            },
        );
    });

    describe('findOne', () => {
        it('should return a QR code by ID', async () => {
            const qrCode = {
                id: 1,
                eventId: 1,
                numericId: 1,
                guest: null,
                computeQrLink: jest.fn(),
            };
            qrCodeRepo.findOne.mockResolvedValue(qrCode);

            const result = await service.findOne(1);

            expect(result).toEqual(qrCode);
            expect(qrCodeRepo.findOne).toHaveBeenCalledWith({
                where: { id: 1 },
                relations: ['guest', 'event'],
            });
        });

        it('should throw NotFoundException when QR code not found', async () => {
            qrCodeRepo.findOne.mockResolvedValue(null);

            await expect(service.findOne(999)).rejects.toThrow(
                NotFoundException,
            );
        });
    });

    describe('createTemplate', () => {
        it('should create a QR template', async () => {
            const dto = {
                name: 'Template 1',
                description: 'A template',
                config: {},
            };
            const created = {
                id: 1,
                eventId: 1,
                ...dto,
            };

            qrTemplateRepo.create.mockReturnValue(created);
            qrTemplateRepo.save.mockResolvedValue(created);

            const result = await service.createTemplate(1, dto as any);

            expect(result).toEqual(created);
            expect(qrTemplateRepo.create).toHaveBeenCalledWith({
                ...dto,
                eventId: 1,
            });
            expect(qrTemplateRepo.save).toHaveBeenCalledWith(created);
        });
    });

    describe('getTemplatesByEvent', () => {
        it('should return paginated templates with qrCount', async () => {
            const templates = [
                { id: 1, name: 'Template 1', qrCount: 5 },
                { id: 2, name: 'Template 2', qrCount: 0 },
            ];

            const mockQb = {
                where: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                loadRelationCountAndMap: jest.fn().mockReturnThis(),
                skip: jest.fn().mockReturnThis(),
                take: jest.fn().mockReturnThis(),
                getManyAndCount: jest.fn().mockResolvedValue([templates, 2]),
            };

            qrTemplateRepo.createQueryBuilder = jest
                .fn()
                .mockReturnValue(mockQb);

            const result = await service.getTemplatesByEvent(1, {
                page: 1,
                limit: 10,
            } as any);

            expect(result.data).toEqual(templates);
            expect(result.total).toBe(2);
            expect(qrTemplateRepo.createQueryBuilder).toHaveBeenCalledWith(
                'template',
            );
            expect(mockQb.where).toHaveBeenCalledWith(
                'template.eventId = :eventId',
                {
                    eventId: 1,
                },
            );
            expect(mockQb.loadRelationCountAndMap).toHaveBeenCalledWith(
                'template.qrCount',
                'template.qrCodes',
            );
            expect(mockQb.skip).toHaveBeenCalledWith(0);
            expect(mockQb.take).toHaveBeenCalledWith(10);
        });

        it('should use correct pagination offset', async () => {
            const mockQb = {
                where: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                loadRelationCountAndMap: jest.fn().mockReturnThis(),
                skip: jest.fn().mockReturnThis(),
                take: jest.fn().mockReturnThis(),
                getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
            };

            qrTemplateRepo.createQueryBuilder = jest
                .fn()
                .mockReturnValue(mockQb);

            await service.getTemplatesByEvent(1, {
                page: 3,
                limit: 20,
            } as any);

            expect(mockQb.skip).toHaveBeenCalledWith(40); // (3-1) * 20
            expect(mockQb.take).toHaveBeenCalledWith(20);
        });
    });

    describe('getTemplateById', () => {
        it('should return a template by ID and event ID', async () => {
            const template = { id: 1, eventId: 1, name: 'Template 1' };
            qrTemplateRepo.findOne.mockResolvedValue(template);

            const result = await service.getTemplateById(1, 1);

            expect(result).toEqual(template);
            expect(qrTemplateRepo.findOne).toHaveBeenCalledWith({
                where: { id: 1, eventId: 1 },
            });
        });

        it('should throw NotFoundException if template not found', async () => {
            qrTemplateRepo.findOne.mockResolvedValue(null);
            await expect(service.getTemplateById(1, 999)).rejects.toThrow(
                NotFoundException,
            );
        });
    });

    describe('updateTemplate', () => {
        it('should update a template', async () => {
            const updated = {
                id: 1,
                name: 'Updated Template',
            };
            qrTemplateRepo.findOne.mockResolvedValue(updated);

            const result = await service.updateTemplate(1, {
                name: 'Updated Template',
            } as any);

            expect(result).toEqual(updated);
            expect(qrTemplateRepo.update).toHaveBeenCalledWith(1, {
                name: 'Updated Template',
            });
        });

        it('should throw NotFoundException when template not found', async () => {
            qrTemplateRepo.findOne.mockResolvedValue(null);

            await expect(
                service.updateTemplate(999, {} as any),
            ).rejects.toThrow(NotFoundException);
        });
    });

    describe('deleteTemplate', () => {
        it('should delete a template', async () => {
            await service.deleteTemplate(1);

            expect(qrTemplateRepo.delete).toHaveBeenCalledWith(1);
        });
    });

    describe('duplicateTemplate', () => {
        it('should duplicate a template with corrected name', async () => {
            const original = { id: 1, eventId: 1, name: 'T1', qrSize: 500 };
            const duplicated = {
                id: 2,
                eventId: 1,
                name: 'T1 (Copy)',
                qrSize: 500,
            };

            // Mock first findOne (original)
            qrTemplateRepo.findOne.mockResolvedValueOnce(original);
            // Mock second findOne (check existing for name collision) - return null (not taken)
            qrTemplateRepo.findOne.mockResolvedValueOnce(null);

            qrTemplateRepo.create.mockReturnValue(duplicated);
            qrTemplateRepo.save.mockResolvedValue(duplicated);

            const result = await service.duplicateTemplate(1, 1);

            expect(result.name).toBe('T1 (Copy)');
            expect(qrTemplateRepo.save).toHaveBeenCalled();
        });

        it('should handle name collisions', async () => {
            const original = { id: 1, eventId: 1, name: 'T1' };
            qrTemplateRepo.findOne
                .mockResolvedValueOnce(original) // original
                .mockResolvedValueOnce({ id: 2 }) // Copy already exists
                .mockResolvedValueOnce(null); // Copy 1 is free

            qrTemplateRepo.create.mockImplementation((d) => d);
            qrTemplateRepo.save.mockImplementation((d) => d);

            const result = await service.duplicateTemplate(1, 1);
            expect(result.name).toBe('T1 (Copy 1)');
        });
    });

    describe('getQrCodesByEvent', () => {
        it('should return paginated QR codes', async () => {
            const qrCodes = [
                {
                    id: 1,
                    numericId: 1,
                    guest: { name: 'Alice' },
                    computeQrLink: jest.fn(),
                },
            ];

            const mockQb = {
                leftJoinAndSelect: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                skip: jest.fn().mockReturnThis(),
                take: jest.fn().mockReturnThis(),
                getManyAndCount: jest.fn().mockResolvedValue([qrCodes, 1]),
            };

            qrCodeRepo.createQueryBuilder.mockReturnValue(mockQb);

            const result = await service.getQrCodesByEvent(1, {
                page: 1,
                limit: 10,
            } as any);

            expect(result.data).toEqual(qrCodes);
            expect(result.total).toBe(1);
        });

        it('should support search filter', async () => {
            const mockQb = {
                leftJoinAndSelect: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                skip: jest.fn().mockReturnThis(),
                take: jest.fn().mockReturnThis(),
                getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
            };

            qrCodeRepo.createQueryBuilder.mockReturnValue(mockQb);

            await service.getQrCodesByEvent(1, {
                page: 1,
                limit: 10,
                search: 'alice',
            } as any);

            expect(mockQb.andWhere).toHaveBeenCalledWith(
                '(LOWER(guest.name) LIKE :search OR ' +
                    'CAST(qrCode.numericId AS TEXT) LIKE :search)',
                { search: '%alice%' },
            );
        });
    });

    describe('findOneByNumericId', () => {
        it('should find QR code by numeric ID', async () => {
            const qrCode = {
                id: 1,
                numericId: 42,
                eventId: 1,
                computeQrLink: jest.fn(),
            };
            qrCodeRepo.findOne.mockResolvedValue(qrCode);

            const result = await service.findOneByNumericId(1, 42);

            expect(result).toEqual(qrCode);
            expect(qrCodeRepo.findOne).toHaveBeenCalledWith({
                where: { eventId: 1, numericId: 42 },
                relations: ['guest', 'event'],
            });
        });

        it('should return null when not found', async () => {
            qrCodeRepo.findOne.mockResolvedValue(null);

            const result = await service.findOneByNumericId(1, 999);

            expect(result).toBeNull();
        });
    });

    describe('setEventDefaultTemplate', () => {
        it('should set event default template', async () => {
            const event = { id: 1, defaultTemplateId: null };
            eventRepo.findOne.mockResolvedValue(event);
            eventRepo.save.mockResolvedValue({
                ...event,
                defaultTemplateId: 1,
            });

            const result = await service.setEventDefaultTemplate(1, 1);

            expect(result.defaultTemplateId).toBe(1);
            expect(eventRepo.save).toHaveBeenCalled();
        });

        it('should throw NotFoundException when event not found', async () => {
            eventRepo.findOne.mockResolvedValue(null);

            await expect(
                service.setEventDefaultTemplate(999, 1),
            ).rejects.toThrow(NotFoundException);
        });
    });

    describe('GoogleDriveProvider', () => {
        it('should be injected into service', () => {
            expect(mockGoogleDriveProvider).toBeDefined();
        });
    });

    describe('updateRedirectLink', () => {
        it('should update redirect link successfully', async () => {
            const qrCode = {
                id: 1,
                redirectLink: null,
                computeQrLink: jest.fn(),
            };
            qrCodeRepo.findOne.mockResolvedValue(qrCode);
            qrCodeRepo.save.mockResolvedValue({
                ...qrCode,
                redirectLink: 'https://example.com',
            });

            const result = await service.updateRedirectLink(
                1,
                'https://example.com',
            );

            expect(qrCode.redirectLink).toBe('https://example.com');
            expect(qrCodeRepo.save).toHaveBeenCalledWith(qrCode);
            expect(result.redirectLink).toBe('https://example.com');
        });

        it('should throw NotFoundException if QR code not found', async () => {
            qrCodeRepo.findOne.mockResolvedValue(null);
            await expect(
                service.updateRedirectLink(999, 'https://example.com'),
            ).rejects.toThrow(NotFoundException);
        });
    });

    describe('bulkUpdate', () => {
        it('should update qrCodes in bulk', async () => {
            const mockQb = {
                update: jest.fn().mockReturnThis(),
                set: jest.fn().mockReturnThis(),
                whereInIds: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                execute: jest.fn().mockResolvedValue({}),
            };
            qrCodeRepo.createQueryBuilder.mockReturnValue(mockQb);
            qrTemplateRepo.findOne.mockResolvedValue({ id: 10 });

            await service.bulkUpdate(1, { qrCodeIds: [1, 2], templateId: 10 });

            expect(mockQb.update).toHaveBeenCalled();
            expect(mockQb.whereInIds).toHaveBeenCalledWith([1, 2]);
        });
    });

    describe('bulkDownloadQr', () => {
        it('should stream a zip for selected codes', async () => {
            const res = {
                attachment: jest.fn(),
            } as any;
            const qrCodes = [
                {
                    id: 1,
                    numericId: 1,
                    eventId: 1,
                    template: { qrSize: 500 },
                    computeQrLink: jest.fn(),
                },
            ];
            qrCodeRepo.find.mockResolvedValue(qrCodes);

            // Archiver is a bit tricky to mock as it's a streamer
            // But we just want to ensure it calls finalized
            await service.bulkDownloadQr(1, [1], res);

            expect(res.attachment).toHaveBeenCalled();
            expect(qrCodeRepo.find).toHaveBeenCalled();
        });
    });

    describe('getAvailableTemplates', () => {
        it('should delegate to TemplateCacheService.getAll()', async () => {
            const mockTemplates = [
                { id: 'qr-scan-page', label: 'Default', language: 'en' },
                { id: 'vi::art-deco.vi', label: 'Art Deco', language: 'vi' },
            ];
            const mockCacheService = module.get<TemplateCacheService>(TemplateCacheService);
            (mockCacheService.getAll as jest.Mock).mockReturnValue(mockTemplates);

            const result = await service.getAvailableTemplates();

            expect(result).toEqual(mockTemplates);
            expect(mockCacheService.getAll).toHaveBeenCalled();
        });
    });

    describe('getTemplateContent', () => {
        it('should delegate to TemplateCacheService.getById()', async () => {
            const mockContent = '<html>test</html>';
            const mockCacheService = module.get<TemplateCacheService>(TemplateCacheService);
            (mockCacheService.getById as jest.Mock).mockReturnValue(mockContent);

            const result = await service.getTemplateContent('qr-scan-page');

            expect(result).toBe(mockContent);
            expect(mockCacheService.getById).toHaveBeenCalledWith('qr-scan-page');
        });

        it('should propagate NotFoundException from cache service', async () => {
            const mockCacheService = module.get<TemplateCacheService>(TemplateCacheService);
            (mockCacheService.getById as jest.Mock).mockImplementation(() => {
                throw new NotFoundException('Template "nonexistent" not found');
            });

            await expect(
                service.getTemplateContent('nonexistent'),
            ).rejects.toThrow(NotFoundException);
        });
    });
});
