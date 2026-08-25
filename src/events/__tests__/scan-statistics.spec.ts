import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { DataSource, Repository } from 'typeorm';
import { EventsService } from '../events.service';
import { Event } from '../entities/event.entity';
import { Media } from '../entities/media.entity';
import { Activity } from '../entities/activity.entity';
import { Guest } from '../../guests/entities/guest.entity';

/**
 * T086: Status-based statistics verification
 *
 * Tests that getEventStatistics correctly:
 * - Counts guests with status='Complete' for totalMedia
 * - Computes activeQrCodes as totalGuests - deniedCount
 * - Returns registeredAttendees from event entity
 */
describe('Status-Based Statistics (T086)', () => {
    let service: EventsService;
    let mockDataSource: Partial<jest.Mocked<DataSource>>;
    let mockEventsRepo: jest.Mocked<Repository<Event>>;
    let mockMediaRepo: jest.Mocked<Repository<Media>>;
    let mockActivitiesRepo: jest.Mocked<Repository<Activity>>;
    let mockConfigService: any;

    const mockEvent: Partial<Event> = {
        id: 1,
        name: 'Test Event',
        registeredAttendees: 50,
    };

    beforeEach(async () => {
        mockEventsRepo = {
            findOne: jest.fn(),
        } as any;

        mockMediaRepo = {
            count: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
        } as any;

        mockActivitiesRepo = {
            create: jest.fn(),
            save: jest.fn(),
            count: jest.fn(),
            findOne: jest.fn(),
            delete: jest.fn(),
        } as any;

        mockDataSource = {
            manager: {
                count: jest.fn(),
            } as any,
        };

        mockConfigService = {
            get: jest.fn().mockReturnValue('200'),
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
                    useValue: mockConfigService,
                },
            ],
        }).compile();

        service = module.get<EventsService>(EventsService);

        // Spy on findOne to return mock event
        (service as any).findOne = jest.fn().mockResolvedValue(mockEvent);
    });

    describe('getEventStatistics', () => {
        it('should count totalMedia as guests with status=Complete', async () => {
            (mockDataSource.manager as any).count.mockImplementation(
                (_entity: any, options: any) => {
                    const where = options?.where;
                    if (where?.status === 'Complete')
                        return Promise.resolve(20);
                    if (where?.status === 'Denied') return Promise.resolve(5);
                    return Promise.resolve(50);
                },
            );

            const stats = await service.getEventStatistics(1);

            expect(stats.totalGuests).toBe(50);
            expect(stats.totalMedia).toBe(20);
            expect(stats.activeQrCodes).toBe(45); // 50 - 5
        });

        it('should return 0 for totalMedia when no guests have status=Complete', async () => {
            (mockDataSource.manager as any).count.mockImplementation(
                (_entity: any, options: any) => {
                    const where = options?.where;
                    if (where?.status === 'Complete') return Promise.resolve(0);
                    if (where?.status === 'Denied') return Promise.resolve(3);
                    return Promise.resolve(50);
                },
            );

            const stats = await service.getEventStatistics(1);

            expect(stats.totalMedia).toBe(0);
            expect(stats.activeQrCodes).toBe(47); // 50 - 3
        });

        it('should return null statistics when event not found', async () => {
            (service as any).findOne = jest.fn().mockResolvedValue(null);

            const stats = await service.getEventStatistics(999);

            expect(stats).toBeNull();
        });

        it('should compute activeQrCodes as totalGuests minus denied count', async () => {
            (mockDataSource.manager as any).count.mockImplementation(
                (_entity: any, options: any) => {
                    const where = options?.where;
                    if (where?.status === 'Complete')
                        return Promise.resolve(18);
                    if (where?.status === 'Denied') return Promise.resolve(10);
                    return Promise.resolve(50);
                },
            );

            const stats = await service.getEventStatistics(1);

            expect(stats.activeQrCodes).toBe(40); // 50 - 10
            expect(stats.totalMedia).toBe(18);
        });
    });
});
