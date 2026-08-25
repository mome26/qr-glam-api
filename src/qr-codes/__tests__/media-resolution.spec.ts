import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { QrCodesService } from '../qr-codes.service';
import { QrCode } from '../entities/qr-code.entity';
import { QrTemplate } from '../entities/qr-template.entity';
import { Event } from '../../events/entities/event.entity';
import { GoogleDriveProvider } from '../../storage/providers/google-drive.provider';
import { EventsService } from '../../events/events.service';
import { DriveFileInfoDto } from '../../storage/dto/drive-file-info.dto';
import { TemplateCacheService } from '../services/template-cache.service';

/**
 * T084: Jest tests for media resolution fallback chain
 * customMediaUrl → provider.getGuestMediaUrl() → placeholder
 */
describe('QrCodesService - Media Resolution Fallback Chain (T084)', () => {
    let service: QrCodesService;
    let googleDriveProvider: any;

    const mockRepositories = {
        qrCodeRepository: {
            findOne: jest.fn(),
            findAndCount: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            delete: jest.fn(),
        },
        qrTemplateRepository: {
            findOne: jest.fn(),
            findAndCount: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            delete: jest.fn(),
        },
        eventRepository: {
            findOne: jest.fn(),
            save: jest.fn(),
        },
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                QrCodesService,
                {
                    provide: getRepositoryToken(QrCode),
                    useValue: mockRepositories.qrCodeRepository,
                },
                {
                    provide: getRepositoryToken(QrTemplate),
                    useValue: mockRepositories.qrTemplateRepository,
                },
                {
                    provide: getRepositoryToken(Event),
                    useValue: mockRepositories.eventRepository,
                },
                {
                    provide: GoogleDriveProvider,
                    useValue: {
                        getGuestMediaUrl: jest.fn(),
                    },
                },
                {
                    provide: EventsService,
                    useValue: { findByIdentifier: jest.fn() },
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
        googleDriveProvider =
            module.get<GoogleDriveProvider>(GoogleDriveProvider);
    });

    describe('resolveGuestMediaUrl fallback chain', () => {
        it('should return DriveFileInfo with customMediaUrl if guest has explicit URL', async () => {
            // Arrange
            const customUrl = 'https://custom-media.example.com/guest-123.jpg';
            const qrCode: any = {
                id: 1,
                eventId: 1,
                guest: {
                    id: 1,
                    customMediaUrl: customUrl,
                },
            };

            // Act
            const result = await service.resolveGuestMediaUrl(qrCode);

            // Assert
            expect(result).toBeDefined();
            expect(result.downloadUrl).toBe(customUrl);
            expect(result.fileId).toBe('custom');
        });

        it('should return DriveFileInfo from provider when customMediaUrl not set', async () => {
            // Arrange
            const providerData: DriveFileInfoDto = {
                fileId: 'abc123',
                fileName: 'guest-2.mp4',
                mimeType: 'video/mp4',
                fileSize: 50000000,
                embedUrl: 'https://drive.google.com/file/d/abc123/preview',
                streamUrl: 'https://drive.google.com/uc?export=view&id=abc123',
                downloadUrl:
                    'https://drive.google.com/uc?export=download&id=abc123',
                thumbnailUrl: 'https://lh3.googleusercontent.com/d/abc123',
            };
            const qrCode: any = {
                id: 2,
                eventId: 1,
                guest: {
                    id: 2,
                    email: 'guest@example.com',
                    customMediaUrl: null,
                },
            };

            googleDriveProvider.getGuestMediaUrl.mockResolvedValue(
                providerData,
            );

            // Act
            const mockEvent: any = {
                id: 1,
                mediaFolderId: 'https://valid-folder',
            };
            const result = await service.resolveGuestMediaUrl(
                qrCode,
                mockEvent,
            );

            // Assert
            expect(result).toEqual(providerData);
            expect(googleDriveProvider.getGuestMediaUrl).toHaveBeenCalledWith(
                1,
                expect.objectContaining({ id: 2, email: 'guest@example.com' }),
                expect.any(Object),
            );
        });

        it('should return null when provider returns null', async () => {
            // Arrange
            const qrCode: any = {
                id: 3,
                eventId: 1,
                guest: {
                    id: 3,
                    customMediaUrl: null,
                },
            };

            googleDriveProvider.getGuestMediaUrl.mockResolvedValue(null);

            // Act
            const mockEvent: any = {
                id: 1,
                mediaFolderId: 'https://valid-folder',
            };
            const result = await service.resolveGuestMediaUrl(
                qrCode,
                mockEvent,
            );

            // Assert
            expect(result).toBeNull();
        });

        it('should fallback to null if provider throws error', async () => {
            // Arrange
            const qrCode: any = {
                id: 4,
                eventId: 1,
                guest: {
                    id: 4,
                    customMediaUrl: null,
                },
            };

            googleDriveProvider.getGuestMediaUrl.mockRejectedValue(
                new Error('OAuth failed'),
            );

            // Act
            const mockEvent: any = {
                id: 1,
                mediaFolderId: 'https://valid-folder',
            };
            const result = await service.resolveGuestMediaUrl(
                qrCode,
                mockEvent,
            );

            // Assert
            expect(result).toBeNull();
        });

        it('should return null when no provider is configured', async () => {
            // Arrange
            const qrCode: any = {
                id: 5,
                eventId: 1,
                guest: {
                    id: 5,
                    customMediaUrl: null,
                },
            };

            // Don't set cloud provider

            // Act
            const result = await service.resolveGuestMediaUrl(qrCode);

            // Assert
            expect(result).toBeNull();
        });

        it('should handle guest without customMediaUrl field gracefully', async () => {
            // Arrange
            const qrCode: any = {
                id: 6,
                eventId: 1,
                guest: {
                    id: 6,
                    // customMediaUrl field missing
                },
            };

            // Act
            const result = await service.resolveGuestMediaUrl(qrCode);

            // Assert
            expect(result).toBeNull();
        });
    });
});
