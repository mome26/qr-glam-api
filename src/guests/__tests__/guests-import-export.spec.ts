import { Test, TestingModule } from '@nestjs/testing';
import { GuestsService } from '../guests.service';
import { DataSource } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Guest } from '../entities/guest.entity';
import { EventsService } from '../../events/events.service';

/**
 * T070: Jest tests for CSV import/export
 */
describe('GuestsService - CSV Import/Export (T070)', () => {
    let service: GuestsService;
    let guestRepo: any;
    let dataSource: any;

    const createTransactionManager = (eventId: number) => ({
        save: jest.fn(),
        create: jest.fn().mockImplementation((entity: any, data: any) => {
            // Add computeQrLink for QrCode entities
            if (data?.numericId !== undefined) {
                return { ...data, computeQrLink: jest.fn() };
            }
            return data;
        }),
        findOne: jest
            .fn()
            .mockResolvedValue({ id: eventId, defaultTemplateId: null }),
        createQueryBuilder: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            getRawOne: jest.fn().mockResolvedValue({ max: 0 }),
        }),
    });

    beforeEach(async () => {
        const eventManagerMock = {
            findOne: jest
                .fn()
                .mockResolvedValue({ id: 1, defaultTemplateId: null }),
        };

        guestRepo = {
            find: jest.fn(),
            findOne: jest.fn(),
            save: jest.fn(),
            createQueryBuilder: jest.fn(),
            delete: jest.fn(),
            manager: eventManagerMock,
        };

        dataSource = {
            transaction: jest.fn(),
            manager: {},
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                GuestsService,
                {
                    provide: getRepositoryToken(Guest),
                    useValue: guestRepo,
                },
                {
                    provide: DataSource,
                    useValue: dataSource,
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

    describe('exportCsv', () => {
        it('should export guests with QR links', async () => {
            // Arrange
            const eventId = 1;
            const mockGuests = [
                {
                    id: 1,
                    name: 'Alice',
                    email: 'alice@example.com',
                    phone: '+1-555-0001',
                    role: 'VIP',
                    group: 'Family',
                    status: 'Pending',
                    qrCode: {
                        numericId: 1,
                        eventId,
                        event: {
                            id: eventId,
                            urlHash: '019d6e1f-3135-774d-9ee2-589961f2d811',
                        },
                    },
                },
            ];

            guestRepo.find.mockResolvedValue(mockGuests);

            // Act
            const csv = await service.exportCsv(eventId);

            // Assert
            expect(csv).toContain('Alice');
            expect(csv).toContain('alice@example.com');
        });

        it('should handle guests without QR codes', async () => {
            // Arrange
            const eventId = 1;
            const mockGuests = [
                {
                    id: 1,
                    name: 'Alice',
                    email: 'alice@example.com',
                    phone: null,
                    role: null,
                    group: null,
                    status: 'Pending',
                    qrCode: null,
                },
            ];

            guestRepo.find.mockResolvedValue(mockGuests);

            // Act
            const csv = await service.exportCsv(eventId);

            // Assert
            expect(csv).toContain('Alice');
            expect(csv).not.toContain('undefined');
        });

        it('should handle special characters in fields', async () => {
            // Arrange
            const eventId = 1;
            const mockGuests = [
                {
                    id: 1,
                    name: 'Alice "The Great" Nguyen',
                    email: 'alice@example.com',
                    phone: '+1-555-0001',
                    role: 'VIP',
                    group: 'Family',
                    status: 'Pending',
                    qrCode: {
                        numericId: 1,
                        eventId,
                        event: {
                            id: eventId,
                            urlHash: '019d6e1f-3135-774d-9ee2-589961f2d811',
                        },
                    },
                },
            ];

            guestRepo.find.mockResolvedValue(mockGuests);

            // Act
            const csv = await service.exportCsv(eventId);

            // Assert - quotes should be escaped
            expect(csv).toContain('""'); // Escaped quotes
        });

        it('should export empty event with header only', async () => {
            // Arrange
            const eventId = 1;
            guestRepo.find.mockResolvedValue([]);

            // Act
            const csv = await service.exportCsv(eventId);

            // Assert
            expect(csv).toContain(
                'Name,Email,Phone,Role,Group,Status,QR Code Link',
            );
            const lines = csv.split('\n').filter((l) => l.trim());
            expect(lines).toHaveLength(1); // Header only
        });
    });

    describe('importCsv', () => {
        it('should import valid CSV data and create guests', async () => {
            // Arrange
            const eventId = 1;
            const csvData = `Name,Email,Phone,Role,Group,Status
Alice,alice@example.com,+1-555-0001,VIP,Family,pending
Bob,bob@example.com,+1-555-0002,Speaker,Staff,complete`;

            guestRepo.find.mockResolvedValue([]); // No existing guests
            guestRepo.save.mockResolvedValue({});
            dataSource.transaction.mockImplementation((cb) =>
                cb(createTransactionManager(eventId)),
            );

            // Act
            const result = await service.importCsv(eventId, csvData);

            // Assert
            expect(result.created).toBe(2);
            expect(result.duplicates).toBe(0);
        });

        it('should detect and skip duplicate emails', async () => {
            // Arrange
            const eventId = 1;
            const csvData = `Name,Email,Phone
Alice,alice@example.com,+1-555-0001
Bob,bob@example.com,+1-555-0002
Charlie,alice@example.com,+1-555-0003`;

            guestRepo.find.mockResolvedValue([
                { email: 'alice@example.com' }, // Existing guest
            ]);
            dataSource.transaction.mockImplementation((cb) =>
                cb(createTransactionManager(eventId)),
            );

            // Act
            const result = await service.importCsv(eventId, csvData);

            // Assert
            expect(result.created).toBe(1); // Alice skipped (in DB), Bob added, Charlie skipped (duplicate email of Alice)
            expect(result.duplicates).toBe(2);
        });

        it('should handle missing optional fields', async () => {
            // Arrange
            const eventId = 1;
            const csvData = `Name,Email
Alice,alice@example.com
Bob,`;

            guestRepo.find.mockResolvedValue([]);
            dataSource.transaction.mockImplementation((cb) =>
                cb(createTransactionManager(eventId)),
            );

            // Act
            const result = await service.importCsv(eventId, csvData);

            // Assert
            expect(result.created).toBe(2);
        });

        it('should handle empty CSV', async () => {
            // Arrange
            const eventId = 1;
            const csvData = `Name,Email,Phone`;

            // Act
            const result = await service.importCsv(eventId, csvData);

            // Assert
            expect(result.created).toBe(0);
            expect(result.duplicates).toBe(0);
        });

        it('should handle CSV with quoted fields', async () => {
            // Arrange
            const eventId = 1;
            const csvData = `"Name","Email","Phone"
"Alice Nguyen","alice@example.com","+1-555-0001"`;

            guestRepo.find.mockResolvedValue([]);
            dataSource.transaction.mockImplementation((cb) =>
                cb(createTransactionManager(eventId)),
            );

            // Act
            const result = await service.importCsv(eventId, csvData);

            // Assert
            expect(result.created).toBe(1);
        });
    });
});
