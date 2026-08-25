import { Test, TestingModule } from '@nestjs/testing';
import { GuestsController } from '../guests.controller';
import { GuestsService } from '../guests.service';
import { EventsService } from '../../events/events.service';
import { Guest } from '../entities/guest.entity';
import { UpdateGuestDto } from '../dto/update-guest.dto';

describe('GuestsController - Guest Status Update Endpoint (T014 US1)', () => {
    let service: GuestsService;
    let controller: GuestsController;

    beforeEach(async () => {
        const mockGuestsService = {
            findOne: jest.fn(),
            updateGuest: jest.fn(),
            update: jest.fn(),
        };

        const mockEventsService = {
            findByIdentifier: jest.fn().mockResolvedValue({ id: 1 }),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [GuestsController],
            providers: [
                {
                    provide: GuestsService,
                    useValue: mockGuestsService,
                },
                {
                    provide: EventsService,
                    useValue: mockEventsService,
                },
            ],
        }).compile();

        service = module.get<GuestsService>(GuestsService);
        controller = module.get<GuestsController>(GuestsController);
    });

    describe('PATCH /:id - Update guest status', () => {
        it('should update guest status from Pending to Denied', async () => {
            const eventId = '1';
            const guestId = 1;
            const updateDto: UpdateGuestDto = {
                status: 'Denied',
            };

            const updatedGuest = new Guest();
            updatedGuest.id = guestId;
            updatedGuest.status = 'Denied';
            updatedGuest.name = 'Test Guest';
            updatedGuest.eventId = 1;
            updatedGuest.deletedAt = null;

            jest.spyOn(service, 'updateGuest').mockResolvedValue(updatedGuest);

            const result = await controller.update(eventId, guestId, updateDto);

            expect(result.status).toBe('Denied');
            expect(result.deletedAt).toBeNull();
            expect(service.updateGuest).toHaveBeenCalledWith(
                1,
                guestId,
                updateDto,
            );
        });

        it('should accept status values: Pending, Complete, Denied', async () => {
            const eventId = '1';
            const guestId = 1;
            const statuses: Array<'Pending' | 'Complete' | 'Denied'> = [
                'Pending',
                'Complete',
                'Denied',
            ];

            for (const status of statuses) {
                const updateDto: UpdateGuestDto = { status };
                const updatedGuest = new Guest();
                updatedGuest.id = guestId;
                updatedGuest.status = status;

                jest.spyOn(service, 'updateGuest').mockResolvedValue(
                    updatedGuest,
                );

                const result = await controller.update(
                    eventId,
                    guestId,
                    updateDto,
                );
                expect(result.status).toBe(status);
            }
        });

        it('should return error if guest not found', async () => {
            const eventId = '1';
            const guestId = 999;
            const updateDto: UpdateGuestDto = { status: 'Denied' };

            jest.spyOn(service, 'updateGuest').mockRejectedValue(
                new Error('Guest not found'),
            );

            await expect(
                controller.update(eventId, guestId, updateDto),
            ).rejects.toThrow('Guest not found');
        });

        it('should preserve createdAt/updatedAt timestamps during status update', async () => {
            const eventId = '1';
            const guestId = 1;
            const createDate = new Date('2025-01-01');
            const updateDto: UpdateGuestDto = { status: 'Denied' };

            const updatedGuest = new Guest();
            updatedGuest.id = guestId;
            updatedGuest.createdAt = createDate;
            updatedGuest.updatedAt = new Date(); // Should be updated
            updatedGuest.status = 'Denied';

            jest.spyOn(service, 'updateGuest').mockResolvedValue(updatedGuest);

            const result = await controller.update(eventId, guestId, updateDto);

            expect(result.createdAt).toEqual(createDate);
            expect(result.updatedAt.getTime()).toBeGreaterThanOrEqual(
                createDate.getTime(),
            );
        });
    });

    describe('DELETE /:id - Deprecation to status=Denied', () => {
        it('should redirect DELETE to PATCH with status=Denied', async () => {
            const eventId = '1';
            const guestId = 1;

            const deniedGuest = new Guest();
            deniedGuest.id = guestId;
            deniedGuest.status = 'Denied';
            deniedGuest.deletedAt = null;

            jest.spyOn(service, 'updateGuest').mockResolvedValue(deniedGuest);

            const result = await controller.remove(eventId, guestId);

            expect(result.status).toBe('Denied');
            expect(result.deletedAt).toBeNull();
            expect(service.updateGuest).toHaveBeenCalledWith(1, guestId, {
                status: 'Denied',
            });
        });
    });
});
