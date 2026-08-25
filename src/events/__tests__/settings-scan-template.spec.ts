import { Test, TestingModule } from '@nestjs/testing';
import { EventsService } from '../events.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Event } from '../entities/event.entity';
import { Media } from '../entities/media.entity';
import { Activity } from '../entities/activity.entity';
import { DataSource } from 'typeorm';
import { EventSettingsDto } from '../dto/event-settings.dto';
import { ConfigService } from '@nestjs/config';

/**
 * T011: scanPageTemplate is saved and returned via event settings
 * T026: scanPageTemplate can be cleared (reset to default) by setting null
 */
describe('EventSettings — scanPageTemplate (T011, T026)', () => {
    let service: EventsService;
    let eventRepo: any;
    let mediaRepo: any;
    let activityRepo: any;
    let dataSource: any;

    beforeEach(async () => {
        eventRepo = {
            findOne: jest.fn(),
            save: jest.fn(),
        };

        mediaRepo = {
            count: jest.fn(),
        };

        activityRepo = {};

        dataSource = {
            manager: {
                count: jest.fn(),
            },
            getRepository: jest.fn().mockReturnValue({
                find: jest.fn().mockResolvedValue([]),
                save: jest.fn().mockResolvedValue([]),
            }),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                EventsService,
                {
                    provide: getRepositoryToken(Event),
                    useValue: eventRepo,
                },
                {
                    provide: getRepositoryToken(Media),
                    useValue: mediaRepo,
                },
                {
                    provide: getRepositoryToken(Activity),
                    useValue: activityRepo,
                },
                {
                    provide: DataSource,
                    useValue: dataSource,
                },
                {
                    provide: ConfigService,
                    useValue: { get: jest.fn().mockReturnValue(undefined) },
                },
            ],
        }).compile();

        service = module.get<EventsService>(EventsService);
    });

    describe('[T011] updateEventSettings saves scanPageTemplate', () => {
        it('should save scanPageTemplate and return it in the response', async () => {
            const eventId = 1;
            const customTemplate = '<html>custom</html>';
            const existingEvent = {
                id: eventId,
                name: 'Test Event',
                visibility: 'private',
                slug: 'test-event',
                scanPageTemplate: null,
            };

            const dto: EventSettingsDto = {
                scanPageTemplate: customTemplate,
            };

            eventRepo.findOne
                .mockResolvedValueOnce(existingEvent) // for findOne (initial load)
                .mockResolvedValueOnce(null); // for slug uniqueness check

            eventRepo.save.mockImplementation((e) => Promise.resolve(e));

            const result = await service.updateEventSettings(eventId, dto);

            expect(result.scanPageTemplate).toBe(customTemplate);
            expect(eventRepo.save).toHaveBeenCalled();
        });
    });

    describe('[T011] getEventSettings returns scanPageTemplate', () => {
        it('should return scanPageTemplate as null when not set', async () => {
            const eventId = 1;
            const existingEvent = {
                id: eventId,
                name: 'Test Event',
                visibility: 'private',
                slug: 'test-event',
                status: 'active',
                mediaSourceUrl: null,
                mediaFolderId: null,
                urlStrategy: 'hash',
                urlHash: 'abc123',
                requireAuthForQrScan: false,
                scanPageTemplate: null,
            };

            eventRepo.findOne.mockResolvedValue(existingEvent);

            const result = await service.getEventSettings(eventId);

            expect(result).toBeDefined();
            expect(result.scanPageTemplate).toBeNull();
        });

        it('should return scanPageTemplate when set', async () => {
            const eventId = 1;
            const customTemplate = '<html>my custom page</html>';
            const existingEvent = {
                id: eventId,
                name: 'Test Event',
                visibility: 'private',
                slug: 'test-event',
                status: 'active',
                mediaSourceUrl: null,
                mediaFolderId: null,
                urlStrategy: 'hash',
                urlHash: 'abc123',
                requireAuthForQrScan: false,
                scanPageTemplate: customTemplate,
            };

            eventRepo.findOne.mockResolvedValue(existingEvent);

            const result = await service.getEventSettings(eventId);

            expect(result).toBeDefined();
            expect(result.scanPageTemplate).toBe(customTemplate);
        });
    });

    describe('[T026] Clear scanPageTemplate (reset to default)', () => {
        it('should clear scanPageTemplate when set to null', async () => {
            const eventId = 1;
            const existingEvent = {
                id: eventId,
                name: 'Test Event',
                visibility: 'private',
                slug: 'test-event',
                scanPageTemplate: '<html>old template</html>',
            };

            const dto: EventSettingsDto = {
                scanPageTemplate: null,
            };

            eventRepo.findOne
                .mockResolvedValueOnce(existingEvent) // for findOne (initial load)
                .mockResolvedValueOnce(null); // for slug uniqueness check

            eventRepo.save.mockImplementation((e) => Promise.resolve(e));

            const result = await service.updateEventSettings(eventId, dto);

            expect(result.scanPageTemplate).toBeNull();
            expect(eventRepo.save).toHaveBeenCalledWith(
                expect.objectContaining({
                    scanPageTemplate: null,
                }),
            );
        });
    });
});
