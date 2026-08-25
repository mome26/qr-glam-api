import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { EventsService } from '../events.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Event } from '../entities/event.entity';
import { Media } from '../entities/media.entity';
import { Activity } from '../entities/activity.entity';
import { DataSource } from 'typeorm';
import { EventSettingsDto } from '../dto/event-settings.dto';
import { ConfigService } from '@nestjs/config';

describe('EventSettings (EventsService)', () => {
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

    describe('updateEventSettings', () => {
        it('should update visibility and slug', async () => {
            const eventId = 1;
            const existingEvent = {
                id: eventId,
                name: 'Original Event',
                visibility: 'private',
                slug: 'original-slug',
            };

            const dto: EventSettingsDto = {
                eventVisibility: 'public',
                eventSlug: 'new-awesome-slug',
            };

            eventRepo.findOne.mockResolvedValue(existingEvent);
            // Mock findOne for uniqueness check (should return null if unique)
            eventRepo.findOne
                .mockResolvedValueOnce(existingEvent) // for the initial load
                .mockResolvedValueOnce(null); // for the uniqueness check

            eventRepo.save.mockImplementation((e) => Promise.resolve(e));

            const result = await service.updateEventSettings(eventId, dto);

            expect(result.eventVisibility).toBe('public');
            expect(result.eventSlug).toBe('new-awesome-slug');
            expect(eventRepo.save).toHaveBeenCalled();
        });

        it('should throw BadRequestException if slug is already taken', async () => {
            const eventId = 1;
            const existingEvent = {
                id: eventId,
                name: 'Event 1',
                slug: 'old-slug',
            };
            const otherEvent = { id: 2, name: 'Event 2', slug: 'taken-slug' };

            const dto: EventSettingsDto = {
                eventSlug: 'taken-slug',
            };

            eventRepo.findOne
                .mockResolvedValueOnce(existingEvent) // for the initial load
                .mockResolvedValueOnce(otherEvent); // for the uniqueness check

            await expect(
                service.updateEventSettings(eventId, dto),
            ).rejects.toThrow(BadRequestException);
        });

        it('should auto-generate a unique slug if not provided', async () => {
            const eventId = 1;
            const existingEvent = {
                id: eventId,
                name: 'My New Event',
                slug: null,
            };

            const dto: EventSettingsDto = {};

            eventRepo.findOne
                .mockResolvedValueOnce(existingEvent) // initial load
                .mockResolvedValueOnce(null); // uniqueness check for 'my-new-event'

            eventRepo.save.mockImplementation((e) => Promise.resolve(e));

            const result = await service.updateEventSettings(eventId, dto);

            expect(result.eventSlug).toBe('my-new-event');
        });

        it('should append a counter if auto-generated slug is not unique', async () => {
            const eventId = 1;
            const existingEvent = { id: eventId, name: 'Test', slug: null };
            const otherEvent = { id: 2, name: 'Test', slug: 'test' };

            const dto: EventSettingsDto = {};

            eventRepo.findOne
                .mockResolvedValueOnce(existingEvent) // initial load
                .mockResolvedValueOnce(otherEvent) // uniqueness check for 'test' fails
                .mockResolvedValueOnce(null); // uniqueness check for 'test-1' passes

            eventRepo.save.mockImplementation((e) => Promise.resolve(e));

            const result = await service.updateEventSettings(eventId, dto);

            expect(result.eventSlug).toBe('test-1');
        });
    });
});
