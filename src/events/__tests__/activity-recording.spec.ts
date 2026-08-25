import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { EventsService } from '../events.service';
import { Event } from '../entities/event.entity';
import { Media } from '../entities/media.entity';
import { Activity } from '../entities/activity.entity';
import { CreateMediaDto } from '../dto/create-media.dto';
import { ConfigService } from '@nestjs/config';

/**
 * T087: Activity recording integration verification
 *
 * Tests that:
 * - Activity is created when media is uploaded
 * - Activity recording failure does NOT throw (try/catch behavior)
 * - Activity recording does not block the primary operation
 */
describe('Activity Recording (T087)', () => {
    let service: EventsService;
    let mockMediaRepo: jest.Mocked<Repository<Media>>;
    let mockActivitiesRepo: jest.Mocked<Repository<Activity>>;
    let mockEventsRepo: jest.Mocked<Repository<Event>>;
    let mockDataSource: Partial<jest.Mocked<DataSource>>;

    const mockEvent: Partial<Event> = {
        id: 1,
        name: 'Test Event',
        registeredAttendees: 0,
    };

    beforeEach(async () => {
        mockEventsRepo = {
            findOne: jest.fn(),
        } as any;

        mockMediaRepo = {
            create: jest.fn(),
            save: jest.fn(),
            count: jest.fn(),
        } as any;

        mockActivitiesRepo = {
            create: jest.fn().mockReturnValue({}),
            save: jest.fn(),
        } as any;

        mockDataSource = {
            manager: {
                count: jest.fn().mockResolvedValue(0),
            } as any,
            createQueryBuilder: jest.fn().mockReturnValue({
                where: jest.fn().mockReturnThis(),
                getCount: jest.fn().mockResolvedValue(0),
            }),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                EventsService,
                {
                    provide: getRepositoryToken(Event),
                    useValue: mockEventsRepo,
                },
                {
                    provide: getRepositoryToken(Media),
                    useValue: mockMediaRepo,
                },
                {
                    provide: getRepositoryToken(Activity),
                    useValue: mockActivitiesRepo,
                },
                {
                    provide: DataSource,
                    useValue: mockDataSource,
                },
                {
                    provide: ConfigService,
                    useValue: { get: jest.fn().mockReturnValue('200') },
                },
            ],
        }).compile();

        service = module.get<EventsService>(EventsService);

        // Spy on findOne to return mock event
        (service as any).findOne = jest.fn().mockResolvedValue(mockEvent);
    });

    describe('createMedia — Activity Recording', () => {
        it('should create an activity record when media is uploaded', async () => {
            const savedMedia = { id: 1, eventId: 1, fileName: 'test.jpg' };
            mockMediaRepo.create.mockReturnValue(savedMedia as any);
            mockMediaRepo.save.mockResolvedValue(savedMedia as any);

            const dto: CreateMediaDto = {
                eventId: 1,
                title: 'test.jpg',
                fileUrl: 'https://example.com/test.jpg',
            };

            await service.createMedia(dto);

            expect(mockActivitiesRepo.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    eventId: 1,
                    type: 'photo_upload',
                    title: 'Media Uploaded',
                    description: 'Media uploaded for event',
                }),
            );
            expect(mockActivitiesRepo.save).toHaveBeenCalled();
        });

        it('should still save media even if activity recording fails', async () => {
            const savedMedia = { id: 1, eventId: 1, fileName: 'test.jpg' };
            mockMediaRepo.create.mockReturnValue(savedMedia as any);
            mockMediaRepo.save.mockResolvedValue(savedMedia as any);

            // Activity save fails
            mockActivitiesRepo.save.mockRejectedValue(
                new Error('Activity table locked'),
            );

            const dto: CreateMediaDto = {
                eventId: 1,
                title: 'test.jpg',
                fileUrl: 'https://example.com/test.jpg',
            };

            // Should NOT throw — media save must succeed
            await expect(service.createMedia(dto)).resolves.toEqual(savedMedia);

            // Media was saved
            expect(mockMediaRepo.save).toHaveBeenCalled();
        });
    });

    describe('createActivity', () => {
        it('should create and save an activity record', async () => {
            const mockActivity = { id: 1, eventId: 1, type: 'guest_added' };
            mockActivitiesRepo.create.mockReturnValue(mockActivity as any);
            mockActivitiesRepo.save.mockResolvedValue(mockActivity as any);

            const result = await service.createActivity(
                1,
                'guest_added',
                'Guest Added',
                'John was added to the event',
                'admin',
                'user-plus',
                42,
                { role: 'VIP' },
            );

            expect(mockActivitiesRepo.create).toHaveBeenCalledWith({
                eventId: 1,
                type: 'guest_added',
                title: 'Guest Added',
                description: 'John was added to the event',
                performedBy: 'admin',
                icon: 'user-plus',
                relatedEntityId: 42,
                metadata: JSON.stringify({ role: 'VIP' }),
            });
            expect(mockActivitiesRepo.save).toHaveBeenCalled();
            expect(result).toEqual(mockActivity);
        });
    });
});
