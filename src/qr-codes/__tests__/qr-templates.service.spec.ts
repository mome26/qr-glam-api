import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { QrCodesService } from '../qr-codes.service';
import { QrCode } from '../entities/qr-code.entity';
import { QrTemplate } from '../entities/qr-template.entity';
import { Event } from '../../events/entities/event.entity';
import { GoogleDriveProvider } from '../../storage/providers/google-drive.provider';
import { EventsService } from '../../events/events.service';
import { TemplateCacheService } from '../services/template-cache.service';

describe('QrCodesService Templates', () => {
    let service: QrCodesService;
    let templateRepo: Repository<QrTemplate>;
    let eventRepo: Repository<Event>;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                QrCodesService,
                {
                    provide: getRepositoryToken(QrCode),
                    useValue: {
                        create: jest.fn(),
                        save: jest.fn(),
                    },
                },
                {
                    provide: getRepositoryToken(QrTemplate),
                    useValue: {
                        create: jest.fn(),
                        save: jest.fn(),
                    },
                },
                {
                    provide: getRepositoryToken(Event),
                    useValue: {
                        findOne: jest.fn(),
                        save: jest.fn(),
                    },
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
        templateRepo = module.get<Repository<QrTemplate>>(
            getRepositoryToken(QrTemplate),
        );
        eventRepo = module.get<Repository<Event>>(getRepositoryToken(Event));
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('createTemplate', () => {
        it('should create a template and NOT auto-set as default if already exists', async () => {
            const dto = {
                name: 'Test Template',
                qrPositionX: 10,
                qrPositionY: 10,
                qrSize: 100,
                isDefault: true,
            };
            const eventId = 123;
            const saved = { ...dto, id: 1, eventId };

            jest.spyOn(templateRepo, 'create').mockReturnValue(saved as any);
            jest.spyOn(templateRepo, 'save').mockResolvedValue(saved as any);
            jest.spyOn(eventRepo, 'findOne').mockResolvedValue({
                id: eventId,
                defaultTemplateId: 999,
            } as any);

            const result = await service.createTemplate(eventId, dto as any);
            expect(result).toEqual(saved);
            expect(templateRepo.create).toHaveBeenCalled();
            expect(eventRepo.save).not.toHaveBeenCalled();
        });

        it('should create a template and auto-set as default if event has none', async () => {
            const dto = {
                name: 'Test Template',
                qrPositionX: 10,
                qrPositionY: 10,
                qrSize: 100,
                isDefault: true,
            };
            const eventId = 123;
            const saved = { ...dto, id: 1, eventId };
            const event = { id: eventId, defaultTemplateId: null };

            jest.spyOn(templateRepo, 'create').mockReturnValue(saved as any);
            jest.spyOn(templateRepo, 'save').mockResolvedValue(saved as any);
            jest.spyOn(eventRepo, 'findOne').mockResolvedValue(event as any);
            jest.spyOn(eventRepo, 'save').mockResolvedValue({
                ...event,
                defaultTemplateId: saved.id,
            } as any);

            const result = await service.createTemplate(eventId, dto as any);
            expect(result).toEqual(saved);
            expect(eventRepo.save).toHaveBeenCalledWith(
                expect.objectContaining({ defaultTemplateId: saved.id }),
            );
        });
    });
});
