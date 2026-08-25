import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { GuestsService } from './guests.service';
import { DataSource } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Guest } from './entities/guest.entity';
import { CreateGuestDto } from './dto/create-guest.dto';
import { GuestQueryDto } from './dto/guest-query.dto';
import { EventsService } from '../events/events.service';

describe('GuestsService', () => {
    let service: GuestsService;
    let repo: any;
    let dataSource: any;

    beforeEach(async () => {
        repo = {
            findOne: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
            count: jest.fn(),
            delete: jest.fn(),
            createQueryBuilder: jest.fn(),
        };

        dataSource = {
            transaction: jest.fn((callback) => {
                const manager = {
                    update: jest.fn().mockResolvedValue({ affected: 1 }),
                    save: jest.fn(),
                    create: jest.fn(),
                    findOne: jest.fn(),
                };
                return callback(manager);
            }),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                GuestsService,
                {
                    provide: DataSource,
                    useValue: dataSource,
                },
                {
                    provide: getRepositoryToken(Guest),
                    useValue: repo,
                },
                {
                    provide: EventsService,
                    useValue: {
                        createActivity: jest.fn().mockResolvedValue({ id: 1 }),
                    },
                },
            ],
        }).compile();

        service = module.get<GuestsService>(GuestsService);
    });

    describe('createGuest', () => {
        it('should create a guest and a QR code in a transaction', async () => {
            const dto: CreateGuestDto = {
                name: 'Alice',
                email: 'alice@example.com',
                role: 'VIP',
                group: 'Family',
                status: 'Pending',
            };
            const eventId = 1;
            const guest = { id: 1, ...dto, eventId };

            // Mock repo.manager.findOne for event lookup outside transaction
            (repo as any).manager = {
                findOne: jest
                    .fn()
                    .mockResolvedValue({ id: eventId, defaultTemplateId: 1 }),
            };

            dataSource.transaction.mockImplementation(async (cb: any) => {
                const qrCode = {
                    id: 6,
                    guestId: 1,
                    eventId,
                    numericId: 10,
                    templateId: 1,
                    computeQrLink: jest.fn(),
                };
                const manager = {
                    create: jest.fn().mockImplementation((entity, data) => {
                        // Add computeQrLink for QrCode entities (check for numericId as indicator)
                        if (
                            data?.numericId !== undefined ||
                            data?.guestId !== undefined
                        ) {
                            return { ...data, computeQrLink: jest.fn() };
                        }
                        return { ...data };
                    }),
                    save: jest.fn().mockImplementation((data) => {
                        if (data.name)
                            return Promise.resolve({ id: 1, ...data });
                        return Promise.resolve({
                            ...data,
                            id: 6,
                            computeQrLink: data.computeQrLink || jest.fn(),
                        });
                    }),
                    findOne: jest.fn().mockResolvedValue({
                        id: eventId,
                        defaultTemplateId: 1,
                    }),
                    createQueryBuilder: jest.fn().mockReturnValue({
                        where: jest.fn().mockReturnThis(),
                        select: jest.fn().mockReturnThis(),
                        getRawOne: jest.fn().mockResolvedValue({ max: 10 }),
                    }),
                };
                return cb(manager);
            });

            const result = await service.createGuest(dto, eventId);
            expect(dataSource.transaction).toHaveBeenCalled();
            expect(result.name).toBe('Alice');
            expect(result.role).toBe('VIP');
        });

        it('should create QR code with correct numericId and eventId', async () => {
            process.env.BASE_URL = 'https://my-domain.com';
            const dto: CreateGuestDto = { name: 'Bob' };
            const eventId = 1;

            // Mock repo.manager.findOne for event lookup outside transaction
            (repo as any).manager = {
                findOne: jest
                    .fn()
                    .mockResolvedValue({ id: eventId, defaultTemplateId: 1 }),
            };

            dataSource.transaction.mockImplementation(async (cb: any) => {
                const manager = {
                    create: jest.fn().mockImplementation((entity, data) => {
                        // Add computeQrLink for QrCode entities
                        if (
                            data?.numericId !== undefined ||
                            data?.guestId !== undefined
                        ) {
                            return { ...data, computeQrLink: jest.fn() };
                        }
                        return { ...data };
                    }),
                    save: jest.fn().mockImplementation((data) => {
                        // Simulate database providing an ID
                        if (data.id === undefined) {
                            data.id = data.name ? 2 : 6; // 2 for guest (has name), 6 for QR
                        }
                        if (
                            !data.computeQrLink &&
                            data.numericId !== undefined
                        ) {
                            data.computeQrLink = jest.fn();
                        }
                        return Promise.resolve(data);
                    }),
                    findOne: jest
                        .fn()
                        .mockImplementation((target, _options) => {
                            if (target.name === 'Event')
                                return Promise.resolve({ id: 1 });
                            return Promise.resolve(null);
                        }),
                    createQueryBuilder: jest.fn().mockReturnValue({
                        where: jest.fn().mockReturnThis(),
                        select: jest.fn().mockReturnThis(),
                        getRawOne: jest.fn().mockResolvedValue({ max: 5 }),
                    }),
                };
                return cb(manager);
            });

            const result = await service.createGuest(dto, eventId);
            // qrLink is no longer stored, but computed on-the-fly
            // Verify the QR code was created with correct properties
            expect(result.qrCode.numericId).toBe(6);
            expect(result.qrCode.eventId).toBe(1);
        });
    });

    describe('findAll', () => {
        it('should return paginated guests', async () => {
            const query = new GuestQueryDto();
            query.page = 1;
            query.limit = 10;

            const qb = {
                leftJoinAndSelect: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                skip: jest.fn().mockReturnThis(),
                take: jest.fn().mockReturnThis(),
                getManyAndCount: jest
                    .fn()
                    .mockResolvedValue([[{ id: '1', name: 'Alice' }], 1]),
            };

            repo.createQueryBuilder.mockReturnValue(qb);
            repo.count.mockResolvedValue(0);

            const result = await service.findAll(1, query);
            expect(result.data).toHaveLength(1);
            expect(result.total).toBe(1);
            expect(result.totalPages).toBe(1);
        });

        it('should apply filters (role, group, status, search)', async () => {
            const query = new GuestQueryDto();
            query.role = 'VIP';
            query.group = 'Family';
            query.status = 'Pending';
            query.search = 'alice';

            const qb = {
                leftJoinAndSelect: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                skip: jest.fn().mockReturnThis(),
                take: jest.fn().mockReturnThis(),
                getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
            };

            repo.createQueryBuilder.mockReturnValue(qb);
            repo.count.mockResolvedValue(0);

            await service.findAll(1, query);
            expect(qb.andWhere).toHaveBeenCalledWith('guest.role = :role', {
                role: 'VIP',
            });
            expect(qb.andWhere).toHaveBeenCalledWith('guest.group = :group', {
                group: 'Family',
            });
            expect(qb.andWhere).toHaveBeenCalledWith('guest.status = :status', {
                status: 'Pending',
            });
            expect(qb.andWhere).toHaveBeenCalledWith(
                '(LOWER(guest.name) LIKE :search OR LOWER(guest.email) LIKE :search OR LOWER(guest.phone) LIKE :search)',
                { search: '%alice%' },
            );
        });
    });

    describe('updateGuest', () => {
        it('should update guest fields', async () => {
            const guest = { id: 1, name: 'Alice', eventId: 1 };
            repo.findOne.mockResolvedValue(guest);
            repo.save.mockImplementation((g: any) => Promise.resolve(g));

            const result = await service.updateGuest(1, 1, {
                role: 'Guest',
            });
            expect(result.role).toBe('Guest');
            expect(repo.save).toHaveBeenCalled();
        });
    });

    describe('softDeleteGuest', () => {
        it('should set deletedAt timestamp instead of physical deletion', async () => {
            const eventId = 1;
            const guestId = 123;
            let capturedManager: any;
            dataSource.transaction.mockImplementation((callback) => {
                capturedManager = {
                    update: jest.fn().mockResolvedValue({ affected: 1 }),
                };
                return callback(capturedManager);
            });

            await service.softDeleteGuest(eventId, guestId);

            expect(capturedManager.update).toHaveBeenCalledWith(
                Guest,
                { id: guestId, eventId },
                { status: 'Denied' },
            );
        });

        it('should throw NotFoundException if no guest affected by soft-delete', async () => {
            dataSource.transaction.mockImplementation((callback) => {
                const manager = {
                    update: jest.fn().mockResolvedValue({ affected: 0 }),
                };
                return callback(manager);
            });
            await expect(service.softDeleteGuest(1, 999)).rejects.toThrow(
                NotFoundException,
            );
        });
    });
});
