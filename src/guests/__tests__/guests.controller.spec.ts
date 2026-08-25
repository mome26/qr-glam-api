import { Test, TestingModule } from '@nestjs/testing';
import { GuestsController } from '../guests.controller';
import { GuestsService } from '../guests.service';
import { EventsService } from '../../events/events.service';
import { CreateGuestDto } from '../dto/create-guest.dto';
import { UpdateGuestDto } from '../dto/update-guest.dto';
import { GuestQueryDto } from '../dto/guest-query.dto';
import { BulkDeleteGuestsDto } from '../dto/bulk-delete-guests.dto';
import { BulkUpdateGuestsDto } from '../dto/bulk-update-guests.dto';

describe('GuestsController', () => {
    let controller: GuestsController;
    let service: any;
    let eventsService: any;

    beforeEach(async () => {
        service = {
            createGuest: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
            updateGuest: jest.fn(),
            softDeleteGuest: jest.fn(),
            bulkUpdate: jest.fn(),
            bulkSoftDelete: jest.fn(),
            exportCsv: jest.fn(),
            importCsv: jest.fn(),
        };

        eventsService = {
            findByIdentifier: jest.fn().mockResolvedValue({ id: 1 }),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [GuestsController],
            providers: [
                {
                    provide: GuestsService,
                    useValue: service,
                },
                {
                    provide: EventsService,
                    useValue: eventsService,
                },
            ],
        }).compile();

        controller = module.get<GuestsController>(GuestsController);
    });

    describe('POST /guests (create)', () => {
        it('should create a guest', async () => {
            const dto: CreateGuestDto = {
                name: 'Alice',
                email: 'alice@example.com',
                phone: '+1234567890',
                role: 'VIP',
                group: 'Family',
                status: 'Pending',
            };

            const created = {
                id: 1,
                ...dto,
                eventId: 1,
                qrCode: {
                    id: 1,
                    numericId: 1,
                    eventId: 1,
                },
            };

            service.createGuest.mockResolvedValue(created);

            const result = await controller.create('1', dto);

            expect(result).toEqual(created);
            expect(service.createGuest).toHaveBeenCalledWith(dto, 1);
        });
    });

    describe('GET /guests (list with filters, pagination)', () => {
        it('should return paginated guests', async () => {
            const query = new GuestQueryDto();
            query.page = 1;
            query.limit = 10;

            const response = {
                data: [
                    { id: 1, name: 'Alice', email: 'alice@example.com' },
                    { id: 2, name: 'Bob', email: 'bob@example.com' },
                ],
                total: 42,
                page: 1,
                limit: 10,
                totalPages: 5,
            };

            service.findAll.mockResolvedValue(response);

            const result = await controller.findAll('1', query);

            expect(result).toEqual(response);
            expect(service.findAll).toHaveBeenCalledWith(1, query);
        });
    });

    describe('PATCH /guests/:id (update)', () => {
        it('should update a guest', async () => {
            const dto: UpdateGuestDto = {
                name: 'Alice Updated',
                email: 'alice.new@example.com',
            } as any;

            const updated = {
                id: 1,
                ...dto,
                eventId: 1,
            };

            service.updateGuest.mockResolvedValue(updated);

            const result = await controller.update('1', 1, dto);

            expect(result).toEqual(updated);
            expect(service.updateGuest).toHaveBeenCalledWith(1, 1, dto);
        });
    });

    describe('DELETE /guests/:id (delete)', () => {
        it('should de-activate a guest (redirect to PATCH with status=Denied)', async () => {
            const updated = { id: 1, status: 'Denied' };
            service.updateGuest.mockResolvedValue(updated);

            const result = await controller.remove('1', 1);

            expect(result).toEqual(updated);
            expect(service.updateGuest).toHaveBeenCalledWith(1, 1, {
                status: 'Denied',
            });
        });
    });

    describe('bulkUpdate', () => {
        it('should bulk update guests', async () => {
            const dto: BulkUpdateGuestsDto = {
                guestIds: [1, 2],
                status: 'confirmed',
            } as any;

            service.bulkUpdate.mockResolvedValue(undefined);

            await controller.bulkUpdate('1', dto);

            expect(service.bulkUpdate).toHaveBeenCalledWith(1, dto);
        });
    });

    describe('bulkSoftDelete', () => {
        it('should bulk soft-delete guests', async () => {
            const dto: BulkDeleteGuestsDto = {
                guestIds: [1, 2],
            };

            service.bulkSoftDelete.mockResolvedValue(undefined);

            await controller.bulkDelete('1', dto);

            expect(service.bulkSoftDelete).toHaveBeenCalledWith(1, dto);
        });
    });

    describe('exportCsv', () => {
        it('should export guests as CSV', async () => {
            const csvContent = 'CSV_CONTENT';
            service.exportCsv.mockResolvedValue(csvContent);

            const mockRes = {
                header: jest.fn().mockReturnThis(),
                attachment: jest.fn().mockReturnThis(),
                send: jest.fn().mockReturnThis(),
            };

            await controller.exportCsv('1', mockRes as any);

            expect(service.exportCsv).toHaveBeenCalledWith(1, undefined);
            expect(mockRes.header).toHaveBeenCalledWith(
                'Content-Type',
                'text/csv',
            );
            expect(mockRes.send).toHaveBeenCalledWith(csvContent);
        });
    });

    describe('importCsv', () => {
        it('should import guests from CSV', async () => {
            const csvContent = 'CSV_CONTENT';
            service.importCsv.mockResolvedValue({ created: 2 });

            const mockFile = {
                buffer: Buffer.from(csvContent),
            };

            const result = await controller.importCsv('1', mockFile);

            expect(result).toEqual({ created: 2 });
            expect(service.importCsv).toHaveBeenCalledWith(1, csvContent);
        });
    });

    describe('findOne (get detail)', () => {
        it('should return guest detail', async () => {
            const guest = { id: 1, name: 'Alice' };
            service.findOne.mockResolvedValue(guest);

            const result = await controller.findOne('1', 1);

            expect(result).toEqual(guest);
        });
    });
});
