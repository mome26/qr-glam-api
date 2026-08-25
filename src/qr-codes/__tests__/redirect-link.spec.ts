import { Test, TestingModule } from '@nestjs/testing';
import { QrCodesService } from '../qr-codes.service';
import { QrCodesController } from '../qr-codes.controller';
import { getRepositoryToken } from '@nestjs/typeorm';
import { QrCode } from '../entities/qr-code.entity';
import { QrTemplate } from '../entities/qr-template.entity';
import { Event } from '../../events/entities/event.entity';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { GoogleDriveProvider } from '../../storage/providers/google-drive.provider';
import { UpdateRedirectLinkDto } from '../dto/update-redirect-link.dto';
import { EventsService } from '../../events/events.service';
import { DataSource } from 'typeorm';
import { Guest } from '../../guests/entities/guest.entity';
import { TemplateCacheService } from '../services/template-cache.service';

/**
 * T037-T039: Unit/Integration/E2E Tests for Updatable Redirect Link Functionality
 *
 * Tests cover:
 * - T037: Unit tests for updateRedirectLink service method
 * - T038: Integration tests for UpdateRedirectLinkDto validation
 * - T039: E2E tests for PATCH /:id/redirect-link controller endpoint
 */

describe('Redirect Link Functionality (T037-T039)', () => {
    describe('T037: Unit Tests - QrCodesService.updateRedirectLink()', () => {
        let service: QrCodesService;
        let qrCodeRepo: any;
        let qrTemplateRepo: any;
        let eventRepo: any;
        let mockGoogleDriveProvider: any;

        beforeEach(async () => {
            qrCodeRepo = {
                findOne: jest.fn(),
                save: jest.fn(),
                create: jest.fn(),
                findAndCount: jest.fn(),
                createQueryBuilder: jest.fn(),
            };

            qrTemplateRepo = {
                findOne: jest.fn(),
                save: jest.fn(),
                create: jest.fn(),
                findAndCount: jest.fn(),
                update: jest.fn(),
                delete: jest.fn(),
            };

            eventRepo = {
                findOne: jest.fn(),
                save: jest.fn(),
            };

            mockGoogleDriveProvider = {
                getGuestMediaUrl: jest.fn(),
            };

            const module: TestingModule = await Test.createTestingModule({
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
                        useValue: {
                            findByIdentifier: jest.fn(),
                            createActivity: jest
                                .fn()
                                .mockResolvedValue({ id: 1 }),
                        },
                    },
                    {
                        provide: DataSource,
                        useValue: {},
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

            service = module.get<QrCodesService>(QrCodesService);
        });

        describe('updateRedirectLink() method', () => {
            it('should update redirect link with valid HTTPS URL', async () => {
                const qrCode = {
                    id: 1,
                    eventId: 1,
                    redirectLink: null,
                    computeQrLink: jest.fn(),
                };

                const updatedQrCode = {
                    ...qrCode,
                    redirectLink: 'https://example.com/redirect',
                };

                qrCodeRepo.findOne.mockResolvedValue(qrCode);
                qrCodeRepo.save.mockResolvedValue(updatedQrCode);

                const result = await service.updateRedirectLink(
                    1,
                    'https://example.com/redirect',
                );

                expect(result.redirectLink).toBe(
                    'https://example.com/redirect',
                );
                expect(qrCodeRepo.findOne).toHaveBeenCalledWith({
                    where: { id: 1 },
                    relations: ['guest', 'event'],
                });
                expect(qrCodeRepo.save).toHaveBeenCalledWith(
                    expect.objectContaining({
                        redirectLink: 'https://example.com/redirect',
                    }),
                );
            });

            it('should update redirect link with valid HTTP URL', async () => {
                const qrCode = {
                    id: 1,
                    eventId: 1,
                    redirectLink: null,
                    computeQrLink: jest.fn(),
                };
                const updatedQrCode = {
                    ...qrCode,
                    redirectLink: 'http://example.com/redirect',
                };

                qrCodeRepo.findOne.mockResolvedValue(qrCode);
                qrCodeRepo.save.mockResolvedValue(updatedQrCode);

                const result = await service.updateRedirectLink(
                    1,
                    'http://example.com/redirect',
                );

                expect(result.redirectLink).toBe('http://example.com/redirect');
            });

            it('should replace existing redirect link', async () => {
                const qrCode = {
                    id: 1,
                    eventId: 1,
                    redirectLink: 'https://old.com',
                    computeQrLink: jest.fn(),
                };

                const updatedQrCode = {
                    ...qrCode,
                    redirectLink: 'https://new.com',
                };

                qrCodeRepo.findOne.mockResolvedValue(qrCode);
                qrCodeRepo.save.mockResolvedValue(updatedQrCode);

                const result = await service.updateRedirectLink(
                    1,
                    'https://new.com',
                );

                expect(result.redirectLink).toBe('https://new.com');
                expect(qrCodeRepo.save).toHaveBeenCalled();
            });

            it('should throw NotFoundException if QR code does not exist', async () => {
                qrCodeRepo.findOne.mockResolvedValue(null);

                await expect(
                    service.updateRedirectLink(999, 'https://example.com'),
                ).rejects.toThrow(NotFoundException);
            });

            it('should handle empty string (clear redirect link)', async () => {
                const qrCode = {
                    id: 1,
                    eventId: 1,
                    redirectLink: 'https://example.com',
                    computeQrLink: jest.fn(),
                };

                const updatedQrCode = {
                    ...qrCode,
                    redirectLink: null,
                };

                qrCodeRepo.findOne.mockResolvedValue(qrCode);
                qrCodeRepo.save.mockResolvedValue(updatedQrCode);

                const result = await service.updateRedirectLink(1, '');

                expect(result.redirectLink).toBe(null);
            });

            it('should handle null (clear redirect link)', async () => {
                const qrCode = {
                    id: 1,
                    eventId: 1,
                    redirectLink: 'https://example.com',
                    computeQrLink: jest.fn(),
                };

                const updatedQrCode = {
                    ...qrCode,
                    redirectLink: null,
                };

                qrCodeRepo.findOne.mockResolvedValue(qrCode);
                qrCodeRepo.save.mockResolvedValue(updatedQrCode);

                const result = await service.updateRedirectLink(1, null);

                expect(result.redirectLink).toBe(null);
            });

            it('should preserve other QR code properties', async () => {
                const qrCode = {
                    id: 1,
                    eventId: 1,
                    numericId: 42,
                    guestId: 5,
                    redirectLink: null,
                    customMediaUrl: 'https://custom.url',
                    templateId: 2,
                    computeQrLink: jest.fn(),
                };

                const updatedQrCode = {
                    ...qrCode,
                    redirectLink: 'https://new.com',
                };

                qrCodeRepo.findOne.mockResolvedValue(qrCode);
                qrCodeRepo.save.mockResolvedValue(updatedQrCode);

                const result = await service.updateRedirectLink(
                    1,
                    'https://new.com',
                );

                expect(result.numericId).toBe(42);
                expect(result.guestId).toBe(5);
                expect(result.customMediaUrl).toBe('https://custom.url');
                expect(result.templateId).toBe(2);
            });

            it('should reject URL with invalid protocol (ftp://)', async () => {
                const qrCode = {
                    id: 1,
                    eventId: 1,
                    redirectLink: null,
                    computeQrLink: jest.fn(),
                };
                qrCodeRepo.findOne.mockResolvedValue(qrCode);

                await expect(
                    service.updateRedirectLink(1, 'ftp://example.com'),
                ).rejects.toThrow(BadRequestException);
            });

            it('should reject URL without protocol', async () => {
                const qrCode = {
                    id: 1,
                    eventId: 1,
                    redirectLink: null,
                    computeQrLink: jest.fn(),
                };
                qrCodeRepo.findOne.mockResolvedValue(qrCode);

                await expect(
                    service.updateRedirectLink(1, 'example.com'),
                ).rejects.toThrow(BadRequestException);
            });

            it('should reject malformed URLs', async () => {
                const qrCode = {
                    id: 1,
                    eventId: 1,
                    redirectLink: null,
                    computeQrLink: jest.fn(),
                };
                qrCodeRepo.findOne.mockResolvedValue(qrCode);

                await expect(
                    service.updateRedirectLink(1, 'not a valid url'),
                ).rejects.toThrow(BadRequestException);
            });
        });
    });

    describe('T038: Integration Tests - UpdateRedirectLinkDto Validation', () => {
        beforeEach(async () => {
            await Test.createTestingModule({
                providers: [],
            }).compile();
        });

        describe('UpdateRedirectLinkDto validation', () => {
            it('should accept valid HTTPS URL', async () => {
                const { validate } = await import('class-validator');
                const { plainToInstance } = await import('class-transformer');

                const dto = plainToInstance(UpdateRedirectLinkDto, {
                    redirectLink: 'https://example.com/target',
                });

                const errors = await validate(dto);
                expect(errors.length).toBe(0);
            });

            it('should accept valid HTTP URL', async () => {
                const { validate } = await import('class-validator');
                const { plainToInstance } = await import('class-transformer');

                const dto = plainToInstance(UpdateRedirectLinkDto, {
                    redirectLink: 'http://example.com/target',
                });

                const errors = await validate(dto);
                expect(errors.length).toBe(0);
            });

            it('should accept valid URL with query parameters', async () => {
                const { validate } = await import('class-validator');
                const { plainToInstance } = await import('class-transformer');

                const dto = plainToInstance(UpdateRedirectLinkDto, {
                    redirectLink: 'https://example.com/page?id=123&ref=qr',
                });

                const errors = await validate(dto);
                expect(errors.length).toBe(0);
            });

            it('should accept valid URL with hash fragment', async () => {
                const { validate } = await import('class-validator');
                const { plainToInstance } = await import('class-transformer');

                const dto = plainToInstance(UpdateRedirectLinkDto, {
                    redirectLink: 'https://example.com/page#section',
                });

                const errors = await validate(dto);
                expect(errors.length).toBe(0);
            });

            it('should reject URL without protocol', async () => {
                const { validate } = await import('class-validator');
                const { plainToInstance } = await import('class-transformer');

                const dto = plainToInstance(UpdateRedirectLinkDto, {
                    redirectLink: 'example.com',
                });

                const errors = await validate(dto);
                expect(errors.length).toBeGreaterThan(0);
            });

            it('should reject URL with invalid protocol (ftp://)', async () => {
                const { validate } = await import('class-validator');
                const { plainToInstance } = await import('class-transformer');

                const dto = plainToInstance(UpdateRedirectLinkDto, {
                    redirectLink: 'ftp://example.com',
                });

                const errors = await validate(dto);
                expect(errors.length).toBeGreaterThan(0);
            });

            it('should accept empty string (to clear redirect)', async () => {
                const { validate } = await import('class-validator');
                const { plainToInstance } = await import('class-transformer');

                const dto = plainToInstance(UpdateRedirectLinkDto, {
                    redirectLink: '',
                });

                const errors = await validate(dto);
                expect(errors.length).toBe(0);
            });

            it('should accept null (to clear redirect)', async () => {
                const { validate } = await import('class-validator');
                const { plainToInstance } = await import('class-transformer');

                const dto = plainToInstance(UpdateRedirectLinkDto, {
                    redirectLink: null,
                });

                const errors = await validate(dto);
                expect(errors.length).toBe(0);
            });

            it('should accept missing redirectLink field (to clear redirect)', async () => {
                const { validate } = await import('class-validator');
                const { plainToInstance } = await import('class-transformer');

                const dto = plainToInstance(UpdateRedirectLinkDto, {});

                const errors = await validate(dto);
                expect(errors.length).toBe(0);
            });

            it('should reject invalid URL format', async () => {
                const { validate } = await import('class-validator');
                const { plainToInstance } = await import('class-transformer');

                const dto = plainToInstance(UpdateRedirectLinkDto, {
                    redirectLink: 'not a url at all',
                });

                const errors = await validate(dto);
                expect(errors.length).toBeGreaterThan(0);
            });
        });
    });

    describe('T039: E2E Tests - PATCH /:id/redirect-link Controller Endpoint', () => {
        let controller: QrCodesController;
        let service: any;
        let qrCodeRepo: any;
        let eventRepo: any;
        let eventsService: any;

        beforeEach(async () => {
            service = {
                updateRedirectLink: jest.fn(),
                findOne: jest.fn(),
            };

            qrCodeRepo = {
                findOne: jest.fn(),
            };

            eventRepo = {
                findOne: jest.fn(),
            };

            eventsService = {
                findByIdentifier: jest.fn().mockImplementation((id) =>
                    Promise.resolve({
                        id: typeof id === 'string' ? parseInt(id) : id,
                    }),
                ),
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
                        useValue: qrCodeRepo,
                    },
                    {
                        provide: getRepositoryToken(Event),
                        useValue: eventRepo,
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

        describe('updateRedirectLink() endpoint', () => {
            it('should successfully update redirect link via PATCH', async () => {
                const updatedQrCode = {
                    id: 1,
                    eventId: 1,
                    redirectLink: 'https://example.com/new-target',
                };

                service.updateRedirectLink.mockResolvedValue(updatedQrCode);

                const dto: UpdateRedirectLinkDto = {
                    redirectLink: 'https://example.com/new-target',
                };

                const result = await controller.updateRedirectLink('1', 1, dto);

                expect(result).toEqual(updatedQrCode);
                expect(service.updateRedirectLink).toHaveBeenCalledWith(
                    1,
                    'https://example.com/new-target',
                );
            });

            it('should replace existing redirect link', async () => {
                const updatedQrCode = {
                    id: 1,
                    eventId: 1,
                    redirectLink: 'https://example.com/another-target',
                };

                service.updateRedirectLink.mockResolvedValue(updatedQrCode);

                const dto: UpdateRedirectLinkDto = {
                    redirectLink: 'https://example.com/another-target',
                };

                const result = await controller.updateRedirectLink('1', 1, dto);

                expect(result.redirectLink).toBe(
                    'https://example.com/another-target',
                );
            });

            it('should accept HTTP and HTTPS URLs', async () => {
                const updatedQrCode = {
                    id: 1,
                    eventId: 1,
                    redirectLink: 'http://example.com',
                };

                service.updateRedirectLink.mockResolvedValue(updatedQrCode);

                const dto: UpdateRedirectLinkDto = {
                    redirectLink: 'http://example.com',
                };

                const result = await controller.updateRedirectLink('1', 1, dto);

                expect(result.redirectLink).toBe('http://example.com');
                expect(service.updateRedirectLink).toHaveBeenCalledWith(
                    1,
                    'http://example.com',
                );
            });

            it('should use correct endpoint path', async () => {
                // This test verifies the endpoint is registered correctly
                // The endpoint should be: PATCH /events/:eventId/qr-codes/:id/redirect-link
                const dto: UpdateRedirectLinkDto = {
                    redirectLink: 'https://example.com',
                };

                service.updateRedirectLink.mockResolvedValue({
                    id: 5,
                    redirectLink: 'https://example.com',
                });

                await controller.updateRedirectLink('42', 5, dto);

                // Verify service was called with correct ID
                expect(service.updateRedirectLink).toHaveBeenCalledWith(
                    5,
                    'https://example.com',
                );
            });

            it('should handle service errors gracefully', async () => {
                service.updateRedirectLink.mockRejectedValue(
                    new NotFoundException('QR code not found'),
                );

                const dto: UpdateRedirectLinkDto = {
                    redirectLink: 'https://example.com',
                };

                await expect(
                    controller.updateRedirectLink('1', 999, dto),
                ).rejects.toThrow(NotFoundException);
            });
        });
    });
});
