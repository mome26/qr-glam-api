import { Test, TestingModule } from '@nestjs/testing';
import { GuestsService } from '../guests.service';
import { DataSource } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Guest } from '../entities/guest.entity';
import { BulkUpdateGuestsDto } from '../dto/bulk-update-guests.dto';
import { BulkDeleteGuestsDto } from '../dto/bulk-delete-guests.dto';
import { EventsService } from '../../events/events.service';

/**
 * T071: Jest tests for bulk operations
 */
describe('GuestsService - Bulk Operations (T071)', () => {
    let service: GuestsService;
    let guestRepo: any;
    let dataSource: any;

    beforeEach(async () => {
        guestRepo = {
            find: jest.fn(),
            findOne: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            createQueryBuilder: jest.fn(),
        };

        dataSource = {
            transaction: jest.fn(),
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
                    useValue: guestRepo,
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

    describe('bulkUpdate', () => {
        it('should bulk update multiple guests with new role and group', async () => {
            // Arrange
            const eventId = 1;
            const dto: BulkUpdateGuestsDto = {
                guestIds: [1, 2, 3],
                role: 'VIP',
                group: 'Updated Group',
            };

            guestRepo.update.mockResolvedValue({ affected: 3 });

            // Act
            await service.bulkUpdate(eventId, dto);

            // Assert
            expect(guestRepo.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    id: expect.any(Object), // In() operator
                    eventId,
                }),
                expect.objectContaining({
                    role: 'VIP',
                    group: 'Updated Group',
                }),
            );
        });

        it('should skip bulk update when no guestIds provided', async () => {
            // Arrange
            const eventId = 1;
            const dto: BulkUpdateGuestsDto = {
                guestIds: [],
                role: 'VIP',
            };

            // Act
            await service.bulkUpdate(eventId, dto);

            // Assert
            expect(guestRepo.update).not.toHaveBeenCalled();
        });

        it('should skip bulk update when no fields to update', async () => {
            // Arrange
            const eventId = 1;
            const dto = {
                guestIds: [1],
            };

            // Act
            await service.bulkUpdate(eventId, dto as any);

            // Assert
            expect(guestRepo.update).not.toHaveBeenCalled();
        });

        it('should update only specified fields', async () => {
            // Arrange
            const eventId = 1;
            const dto: BulkUpdateGuestsDto = {
                guestIds: [1, 2],
                status: 'pending',
            };

            guestRepo.update.mockResolvedValue({ affected: 2 });

            // Act
            await service.bulkUpdate(eventId, dto);

            // Assert
            expect(guestRepo.update).toHaveBeenCalledWith(
                expect.any(Object),
                expect.objectContaining({ status: 'pending' }),
            );
            expect(guestRepo.update).toHaveBeenCalledWith(
                expect.any(Object),
                expect.not.objectContaining({ role: expect.anything() }),
            );
        });
    });

    describe('bulkSoftDelete', () => {
        it('should bulk soft-delete multiple guests', async () => {
            // Arrange
            const eventId = 1;
            const dto: BulkDeleteGuestsDto = {
                guestIds: [1, 2, 3],
            };

            guestRepo.update.mockResolvedValue({ affected: 3 });

            // Act
            await service.bulkSoftDelete(eventId, dto);

            // Assert
            expect(guestRepo.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    id: expect.any(Object), // In() operator
                    eventId,
                }),
                expect.objectContaining({
                    status: 'Denied',
                }),
            );
        });

        it('should skip bulk soft-delete when no guestIds provided', async () => {
            // Arrange
            const eventId = 1;
            const dto: BulkDeleteGuestsDto = {
                guestIds: [],
            };

            // Act
            await service.bulkSoftDelete(eventId, dto);

            // Assert
            expect(guestRepo.update).not.toHaveBeenCalled();
        });

        it('should soft-delete only guests in specified event', async () => {
            // Arrange
            const eventId = 1;
            const dto: BulkDeleteGuestsDto = {
                guestIds: [1, 2],
            };

            guestRepo.update.mockResolvedValue({ affected: 2 });

            // Act
            await service.bulkSoftDelete(eventId, dto);

            // Assert - eventId should be in where clause
            expect(guestRepo.update).toHaveBeenCalledWith(
                expect.objectContaining({ eventId }),
                expect.any(Object),
            );
        });
    });

    describe('Bulk Operations - Edge Cases', () => {
        it('should handle very large bulk updates (100+ guests)', async () => {
            // Arrange
            const eventId = 1;
            const largeGuestIds = Array.from({ length: 150 }, (_, i) => i + 1);
            const dto: BulkUpdateGuestsDto = {
                guestIds: largeGuestIds,
                role: 'Attendee',
            };

            guestRepo.update.mockResolvedValue({ affected: 150 });

            // Act
            await service.bulkUpdate(eventId, dto);

            // Assert
            expect(guestRepo.update).toHaveBeenCalled();
        });

        it('should handle partial failures gracefully', async () => {
            // Arrange
            const eventId = 1;
            const dto: BulkUpdateGuestsDto = {
                guestIds: [1, 2],
                role: 'VIP',
            };

            guestRepo.update.mockResolvedValue({ affected: 1 }); // Only 1 updated

            // Act
            await service.bulkUpdate(eventId, dto);

            // Assert - should complete without throwing
            expect(guestRepo.update).toHaveBeenCalled();
        });
    });
});
