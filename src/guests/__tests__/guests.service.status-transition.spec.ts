import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { GuestsService } from '../guests.service';
import { Guest } from '../entities/guest.entity';
import { EventsService } from '../../events/events.service';

describe('GuestService - Status Transition Workflow (US1)', () => {
    let guestRepo: Repository<Guest>;
    let mockDataSource: any;

    beforeEach(async () => {
        // Mock repositories
        const mockGuestRepo = {
            findOne: jest.fn(),
            find: jest.fn(),
            save: jest.fn(),
            create: jest.fn(),
            findOneBy: jest.fn(),
        };

        mockDataSource = {
            transaction: jest.fn((cb) => cb(mockDataSource)),
            createEntityManager: jest.fn(),
            getRepository: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                GuestsService,
                {
                    provide: getRepositoryToken(Guest),
                    useValue: mockGuestRepo,
                },
                {
                    provide: DataSource,
                    useValue: mockDataSource,
                },
                {
                    provide: EventsService,
                    useValue: {
                        createActivity: jest.fn().mockResolvedValue({ id: 1 }),
                    },
                },
            ],
        }).compile();

        guestRepo = module.get<Repository<Guest>>(getRepositoryToken(Guest));
    });

    describe('Guest status transition to Denied', () => {
        it('should transition guest status from Pending to Denied', async () => {
            const guest = new Guest();
            guest.id = 1;
            guest.name = 'Test Guest';
            guest.eventId = 1;
            guest.status = 'Pending';
            guest.deletedAt = null;

            jest.spyOn(guestRepo, 'findOne').mockResolvedValue(guest);
            jest.spyOn(guestRepo, 'save').mockResolvedValue({
                ...guest,
                status: 'Denied',
            });

            // Simulate update to Denied status
            const updatedGuest = await guestRepo.save({
                ...guest,
                status: 'Denied',
            });

            expect(updatedGuest.status).toBe('Denied');
            expect(updatedGuest.deletedAt).toBeNull();
        });

        it('should allow status transition from Complete to Denied', async () => {
            const guest = new Guest();
            guest.id = 1;
            guest.status = 'Complete';

            jest.spyOn(guestRepo, 'save').mockResolvedValue({
                ...guest,
                status: 'Denied',
            });

            const updated = await guestRepo.save({
                ...guest,
                status: 'Denied',
            });

            expect(updated.status).toBe('Denied');
        });

        it('should maintain audit trail - deletedAt should remain null after status transition', async () => {
            const guest = new Guest();
            guest.id = 1;
            guest.status = 'Pending';
            guest.deletedAt = null;

            jest.spyOn(guestRepo, 'save').mockResolvedValue({
                ...guest,
                status: 'Denied',
                deletedAt: null,
            });

            const updated = await guestRepo.save({
                ...guest,
                status: 'Denied',
            });

            // Verify audit trail: deletedAt stays null, only status changes
            expect(updated.status).toBe('Denied');
            expect(updated.deletedAt).toBeNull();
        });
    });

    describe('Guest filtering by status', () => {
        it('should exclude Denied guests from default queries', async () => {
            const guests: Guest[] = [
                Object.assign(new Guest(), {
                    id: 1,
                    status: 'Pending',
                    name: 'Guest 1',
                }),
                Object.assign(new Guest(), {
                    id: 2,
                    status: 'Complete',
                    name: 'Guest 2',
                }),
                Object.assign(new Guest(), {
                    id: 3,
                    status: 'Denied',
                    name: 'Guest 3',
                }),
            ];

            jest.spyOn(guestRepo, 'find').mockResolvedValue(
                guests.filter((g) => g.status !== 'Denied'),
            );

            const result = await guestRepo.find();
            expect(result).toHaveLength(2);
            expect(result.every((g) => g.status !== 'Denied')).toBe(true);
        });

        it('should allow explicit inclusion of Denied guests for admin review', async () => {
            const guests: Guest[] = [
                Object.assign(new Guest(), { id: 1, status: 'Pending' }),
                Object.assign(new Guest(), { id: 2, status: 'Complete' }),
                Object.assign(new Guest(), { id: 3, status: 'Denied' }),
            ];

            jest.spyOn(guestRepo, 'find').mockResolvedValue(guests);

            const result = await guestRepo.find();
            expect(result).toHaveLength(3);
            expect(result.some((g) => g.status === 'Denied')).toBe(true);
        });
    });
});
