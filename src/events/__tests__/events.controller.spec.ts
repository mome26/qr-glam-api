import { Test, TestingModule } from '@nestjs/testing';
import { EventsController } from '../events.controller';
import { EventsService } from '../events.service';
import { GuestsService } from '../../guests/guests.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { CreateEventDto } from '../dto/create-event.dto';
import { UpdateEventDto } from '../dto/update-event.dto';
import { CreateMediaDto } from '../dto/create-media.dto';
import { MediaQueryDto } from '../dto/media-query.dto';
import { EventQueryDto } from '../dto/event-query.dto';

describe('EventsController', () => {
    let controller: EventsController;
    let service: EventsService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [EventsController],
            providers: [
                {
                    provide: EventsService,
                    useValue: {
                        create: jest.fn(),
                        findAll: jest.fn(),
                        findUpcoming: jest.fn(),
                        findByQrCodeId: jest.fn(),
                        findOne: jest.fn(),
                        findByIdentifier: jest.fn(),
                        update: jest.fn(),
                        registerAttendee: jest.fn(),
                        unregisterAttendee: jest.fn(),
                        remove: jest.fn(),
                        createMedia: jest.fn(),
                        findMediaByEventId: jest.fn(),
                        findMedia: jest.fn(),
                        updateMedia: jest.fn(),
                        removeMedia: jest.fn(),
                        findActivitiesByEventId: jest.fn(),
                        getEventSettings: jest.fn(),
                        updateEventSettings: jest.fn(),
                        getEventStatistics: jest.fn(),
                    },
                },
                {
                    provide: GuestsService,
                    useValue: {},
                },
            ],
        }).compile();

        controller = module.get<EventsController>(EventsController);
        service = module.get<EventsService>(EventsService);
    });

    const req = { user: { id: 1 } };

    describe('create', () => {
        it('should create an event', async () => {
            const dto = { name: 'New Event' } as CreateEventDto;
            (service.create as jest.Mock).mockResolvedValue({ id: 1, ...dto });
            const result = await controller.create(dto, req);
            expect(result).toEqual({ id: 1, ...dto });
            expect(service.create).toHaveBeenCalledWith(dto, 1);
        });
    });

    describe('findAll', () => {
        it('should return paginated events', async () => {
            const query = { page: 1, limit: 10 } as EventQueryDto;
            const expected = { data: [], total: 0 };
            (service.findAll as jest.Mock).mockResolvedValue(expected);
            const result = await controller.findAll(req, query);
            expect(result).toBe(expected);
        });
    });

    describe('findUpcoming', () => {
        it('should return upcoming events', async () => {
            const expected = [{ id: 1 }];
            (service.findUpcoming as jest.Mock).mockResolvedValue(expected);
            expect(await controller.findUpcoming(req)).toBe(expected);
        });
    });

    describe('findOne', () => {
        it('should return an event if found', async () => {
            const event = { id: 1 };
            (service.findByIdentifier as jest.Mock).mockResolvedValue(event);
            expect(await controller.findOne('1')).toBe(event);
        });

        it('should throw NotFoundException if not found', async () => {
            (service.findByIdentifier as jest.Mock).mockRejectedValue(
                new NotFoundException(),
            );
            await expect(controller.findOne('999')).rejects.toThrow(
                NotFoundException,
            );
        });
    });

    describe('update', () => {
        it('should update an event', async () => {
            const event = { id: 1 };
            const dto = { name: 'Updated' } as UpdateEventDto;
            (service.findByIdentifier as jest.Mock).mockResolvedValue(event);
            (service.update as jest.Mock).mockResolvedValue({
                ...event,
                ...dto,
            });
            expect(await controller.update('1', dto, req as any)).toEqual({
                ...event,
                ...dto,
            });
        });
    });

    describe('registerAttendee', () => {
        it('should register an attendee', async () => {
            const event = { id: 1, maxAttendees: 10, registeredAttendees: 5 };
            (service.findByIdentifier as jest.Mock).mockResolvedValue(event);
            (service.registerAttendee as jest.Mock).mockResolvedValue({
                ...event,
                registeredAttendees: 6,
            });
            const result = await controller.registerAttendee('1');
            expect(result.registeredAttendees).toBe(6);
        });

        it('should throw BadRequestException if capacity reached', async () => {
            const event = { id: 1, maxAttendees: 10, registeredAttendees: 10 };
            (service.findByIdentifier as jest.Mock).mockResolvedValue(event);
            await expect(controller.registerAttendee('1')).rejects.toThrow(
                BadRequestException,
            );
        });
    });

    describe('createMedia', () => {
        it('should create media for an event', async () => {
            const event = { id: 1 };
            const dto = { title: 'Media' } as CreateMediaDto;
            (service.findByIdentifier as jest.Mock).mockResolvedValue(event);
            (service.createMedia as jest.Mock).mockResolvedValue({
                id: 1,
                ...dto,
            });
            const result = await controller.createMedia('1', dto);
            expect(result.id).toBe(1);
        });
    });

    describe('getMediaByEvent', () => {
        it('should return media for an event', async () => {
            const query = { page: 1 } as MediaQueryDto;
            const expected = { data: [] };
            (service.findByIdentifier as jest.Mock).mockResolvedValue({
                id: 1,
            });
            (service.findMediaByEventId as jest.Mock).mockResolvedValue(
                expected,
            );
            expect(await controller.getMediaByEvent('1', query)).toBe(expected);
        });
    });

    describe('getMedia', () => {
        it('should return a specific media item', async () => {
            const media = { id: 1 };
            (service.findMedia as jest.Mock).mockResolvedValue(media);
            expect(await controller.getMedia(1)).toBe(media);
        });
    });

    describe('updateMedia', () => {
        it('should update media', async () => {
            const media = { id: 1 };
            const dto = { title: 'Updated' };
            (service.findMedia as jest.Mock).mockResolvedValue(media);
            (service.updateMedia as jest.Mock).mockResolvedValue({
                ...media,
                ...dto,
            });
            expect(await controller.updateMedia(1, dto as any)).toEqual({
                ...media,
                ...dto,
            });
        });
    });

    describe('removeMedia', () => {
        it('should remove media', async () => {
            (service.findMedia as jest.Mock).mockResolvedValue({ id: 1 });
            expect(await controller.removeMedia(1)).toEqual({ success: true });
        });
    });

    describe('getActivities', () => {
        it('should return activities', async () => {
            const expected = { data: [] };
            (service.findByIdentifier as jest.Mock).mockResolvedValue({
                id: 1,
            });
            (service.findActivitiesByEventId as jest.Mock).mockResolvedValue(
                expected,
            );
            expect(await controller.getActivities('1', {} as any)).toBe(
                expected,
            );
        });
    });

    describe('getSettings', () => {
        it('should return settings', async () => {
            const settings = { id: 1 };
            (service.findByIdentifier as jest.Mock).mockResolvedValue({
                id: 1,
            });
            (service.getEventSettings as jest.Mock).mockResolvedValue(settings);
            expect(await controller.getSettings('1')).toBe(settings);
        });
    });

    describe('updateSettings', () => {
        it('should update settings', async () => {
            const settings = { id: 's1' };
            (service.findByIdentifier as jest.Mock).mockResolvedValue({
                id: 1,
            });
            (service.updateEventSettings as jest.Mock).mockResolvedValue(
                settings,
            );
            expect(await controller.updateSettings('1', {} as any)).toBe(
                settings,
            );
        });
    });

    describe('getStatistics', () => {
        it('should return statistics', async () => {
            const stats = { totalGuests: 10 };
            (service.findByIdentifier as jest.Mock).mockResolvedValue({
                id: 1,
            });
            (service.getEventStatistics as jest.Mock).mockResolvedValue(stats);
            expect(await controller.getStatistics('1')).toBe(stats);
        });
    });

    describe('remove', () => {
        it('should remove an event', async () => {
            (service.findByIdentifier as jest.Mock).mockResolvedValue({
                id: 1,
            });
            expect(await controller.remove('1', req as any)).toEqual({
                success: true,
            });
        });
    });

    describe('unregisterAttendee', () => {
        it('should unregister an attendee', async () => {
            const event = { id: 1 };
            (service.findByIdentifier as jest.Mock).mockResolvedValue(event);
            (service.unregisterAttendee as jest.Mock).mockResolvedValue(event);
            expect(await controller.unregisterAttendee('1')).toBe(event);
        });
    });

    describe('findByQrCodeId', () => {
        it('should find event by QR code ID', async () => {
            const events = [{ id: 1 }];
            (service.findByQrCodeId as jest.Mock).mockResolvedValue(events);
            expect(await controller.findByQrCodeId(1)).toBe(events);
        });
    });
});
