import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ForbiddenException } from '@nestjs/common';
import { EventsService } from '../events.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Event } from '../entities/event.entity';
import { Media } from '../entities/media.entity';
import { Activity } from '../entities/activity.entity';
import { DataSource } from 'typeorm';
import { CreateEventDto } from '../dto/create-event.dto';
import { UpdateEventDto } from '../dto/update-event.dto';

describe('EventsService', () => {
    let service: EventsService;
    let eventRepo: any;
    let mediaRepo: any;
    let activityRepo: any;
    let dataSource: any;
    let manager: any;
    let configService: any;

    beforeEach(async () => {
        eventRepo = {
            findOne: jest.fn(),
            find: jest.fn(),
            findAndCount: jest.fn(),
            createQueryBuilder: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            count: jest.fn(),
        };

        mediaRepo = {
            findOne: jest.fn(),
            findAndCount: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            createQueryBuilder: jest.fn(),
            count: jest.fn(),
        };

        activityRepo = {
            findAndCount: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            delete: jest.fn(),
            count: jest.fn(),
            findOne: jest.fn(),
        };

        manager = {
            update: jest.fn(),
            delete: jest.fn(),
        };
        dataSource = {
            manager: {
                count: jest.fn(),
                createQueryBuilder: jest.fn().mockReturnValue({
                    where: jest.fn().mockReturnThis(),
                    andWhere: jest.fn().mockReturnThis(),
                    getCount: jest.fn().mockResolvedValue(15),
                }),
            },
            transaction: jest.fn((callback) => callback(manager)),
            getRepository: jest.fn().mockReturnValue({
                find: jest.fn().mockResolvedValue([]),
                save: jest.fn().mockResolvedValue([]),
            }),
        };
        configService = {
            get: jest.fn().mockReturnValue('200'),
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
                    useValue: configService,
                },
            ],
        }).compile();

        service = module.get<EventsService>(EventsService);
    });

    describe('create', () => {
        it('should create an event', async () => {
            const dto: CreateEventDto = {
                name: 'Conference 2024',
                description: 'Annual conference',
                date: '2024-12-01',
                location: 'New York',
            } as any;

            const created = {
                id: 1,
                ...dto,
                date: new Date(dto.date),
                ownerId: 1,
            };

            eventRepo.create.mockReturnValue(created);
            eventRepo.save.mockResolvedValue(created);

            const result = await service.create(dto, 1);

            expect(result).toEqual(created);
            expect(eventRepo.create).toHaveBeenCalledWith({
                ...dto,
                date: new Date(dto.date),
                ownerId: 1,
            });
            expect(eventRepo.save).toHaveBeenCalledWith(created);
        });
    });

    describe('findAll', () => {
        it('should return public state events for MEMBER and filter by visibility', async () => {
            const events = [
                {
                    id: 1,
                    name: 'Event 1',
                    status: 'upcoming',
                    visibility: 'public',
                },
            ];

            const mockQb = {
                createQueryBuilder: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                skip: jest.fn().mockReturnThis(),
                take: jest.fn().mockReturnThis(),
                getManyAndCount: jest.fn().mockResolvedValue([events, 1]),
            };

            eventRepo.createQueryBuilder.mockReturnValue(mockQb);

            const result = await service.findAll(1, 'MEMBER', {
                page: 1,
                limit: 10,
            } as any);

            expect(result.data).toEqual(events);
            expect(result.total).toBe(1);
            expect(mockQb.where).toHaveBeenCalledWith(
                'event.status IN (:...publicStatuses)',
                {
                    publicStatuses: ['upcoming', 'ongoing', 'completed'],
                },
            );
            expect(mockQb.andWhere).toHaveBeenCalledWith(
                'event.visibility = :visibility',
                { visibility: 'public' },
            );
        });

        it('should not return private events for MEMBER', async () => {
            const privateEvents = [
                {
                    id: 1,
                    name: 'Private Event',
                    status: 'upcoming',
                    visibility: 'private',
                },
            ];

            const mockQb = {
                createQueryBuilder: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                skip: jest.fn().mockReturnThis(),
                take: jest.fn().mockReturnThis(),
                getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
            };

            eventRepo.createQueryBuilder.mockReturnValue(mockQb);

            await service.findAll(1, 'MEMBER', {
                page: 1,
                limit: 10,
            } as any);

            // MEMBER should have visibility filter applied
            expect(mockQb.andWhere).toHaveBeenCalledWith(
                'event.visibility = :visibility',
                { visibility: 'public' },
            );
        });

        it('should return all events for ADMIN including private ones', async () => {
            const events = [
                {
                    id: 1,
                    name: 'Event 1',
                    status: 'draft',
                    visibility: 'private',
                },
                {
                    id: 2,
                    name: 'Event 2',
                    status: 'upcoming',
                    visibility: 'public',
                },
            ];

            const mockQb = {
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                skip: jest.fn().mockReturnThis(),
                take: jest.fn().mockReturnThis(),
                getManyAndCount: jest.fn().mockResolvedValue([events, 2]),
            };

            eventRepo.createQueryBuilder.mockReturnValue(mockQb);

            const result = await service.findAll(1, 'ADMIN', {
                page: 1,
                limit: 10,
            } as any);

            expect(result.data).toEqual(events);
            expect(result.total).toBe(2);
            // ADMIN should not have status or visibility filter applied
            expect(mockQb.where).not.toHaveBeenCalledWith(
                'event.status IN (:...publicStatuses)',
                expect.any(Object),
            );
            // ADMIN should not have visibility filter
            const andWhereCalls = mockQb.andWhere.mock.calls;
            const visibilityFilterCall = andWhereCalls.find(
                (call) => call[0] === 'event.visibility = :visibility',
            );
            expect(visibilityFilterCall).toBeUndefined();
        });

        it('should return all events for STAFF including private ones', async () => {
            const events = [
                {
                    id: 1,
                    name: 'Event 1',
                    status: 'draft',
                    visibility: 'private',
                },
                {
                    id: 2,
                    name: 'Event 2',
                    status: 'upcoming',
                    visibility: 'public',
                },
            ];

            const mockQb = {
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                skip: jest.fn().mockReturnThis(),
                take: jest.fn().mockReturnThis(),
                getManyAndCount: jest.fn().mockResolvedValue([events, 2]),
            };

            eventRepo.createQueryBuilder.mockReturnValue(mockQb);

            const result = await service.findAll(1, 'STAFF', {
                page: 1,
                limit: 10,
            } as any);

            expect(result.data).toEqual(events);
            expect(result.total).toBe(2);
            // STAFF should not have status or visibility filter applied
            expect(mockQb.where).not.toHaveBeenCalledWith(
                'event.status IN (:...publicStatuses)',
                expect.any(Object),
            );
            // STAFF should not have visibility filter
            const andWhereCalls = mockQb.andWhere.mock.calls;
            const visibilityFilterCall = andWhereCalls.find(
                (call) => call[0] === 'event.visibility = :visibility',
            );
            expect(visibilityFilterCall).toBeUndefined();
        });

        it('should filter by search for MEMBER', async () => {
            const mockQb = {
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                skip: jest.fn().mockReturnThis(),
                take: jest.fn().mockReturnThis(),
                getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
            };

            eventRepo.createQueryBuilder.mockReturnValue(mockQb);

            await service.findAll(1, 'MEMBER', {
                page: 1,
                limit: 10,
                search: 'conference',
            } as any);

            expect(mockQb.andWhere).toHaveBeenCalledWith(
                expect.stringContaining('LOWER(event.name)'),
                expect.any(Object),
            );
        });

        it('should filter by search for ADMIN', async () => {
            const mockQb = {
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                skip: jest.fn().mockReturnThis(),
                take: jest.fn().mockReturnThis(),
                getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
            };

            eventRepo.createQueryBuilder.mockReturnValue(mockQb);

            await service.findAll(1, 'ADMIN', {
                page: 1,
                limit: 10,
                search: 'conference',
            } as any);

            expect(mockQb.andWhere).toHaveBeenCalledWith(
                expect.stringContaining('LOWER(event.name)'),
                expect.any(Object),
            );
        });

        it('should filter by status', async () => {
            const mockQb = {
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                skip: jest.fn().mockReturnThis(),
                take: jest.fn().mockReturnThis(),
                getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
            };

            eventRepo.createQueryBuilder.mockReturnValue(mockQb);

            await service.findAll(1, 'MEMBER', {
                page: 1,
                limit: 10,
                status: 'upcoming',
            } as any);

            expect(mockQb.andWhere).toHaveBeenCalledWith(
                'event.status = :status',
                {
                    status: 'upcoming',
                },
            );
        });

        it('should filter by date range', async () => {
            const mockQb = {
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                skip: jest.fn().mockReturnThis(),
                take: jest.fn().mockReturnThis(),
                getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
            };

            eventRepo.createQueryBuilder.mockReturnValue(mockQb);

            await service.findAll(1, 'MEMBER', {
                page: 1,
                limit: 10,
                dateRangeStart: '2024-01-01',
                dateRangeEnd: '2024-12-31',
            } as any);

            expect(mockQb.andWhere).toHaveBeenCalledWith(
                'event.date >= :startDate',
                expect.any(Object),
            );
        });

        it('should support custom ordering', async () => {
            const mockQb = {
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                skip: jest.fn().mockReturnThis(),
                take: jest.fn().mockReturnThis(),
                getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
            };

            eventRepo.createQueryBuilder.mockReturnValue(mockQb);

            await service.findAll(1, 'MEMBER', {
                page: 1,
                limit: 10,
                orderBy: 'name:DESC',
            } as any);

            expect(mockQb.orderBy).toHaveBeenCalledWith('event.name', 'DESC');
        });
    });

    describe('findUpcoming', () => {
        it('should return upcoming events for MEMBER (public state)', async () => {
            const events = [{ id: 1, status: 'upcoming' }];
            eventRepo.find.mockResolvedValue(events);

            const result = await service.findUpcoming(1, 'MEMBER');

            expect(result).toEqual(events);
            expect(eventRepo.find).toHaveBeenCalledWith({
                where: { status: 'upcoming' },
                order: { date: 'ASC' },
            });
        });

        it('should return all upcoming events for ADMIN', async () => {
            const events = [
                { id: 1, status: 'upcoming' },
                { id: 2, status: 'upcoming' },
            ];
            eventRepo.find.mockResolvedValue(events);

            const result = await service.findUpcoming(1, 'ADMIN');

            expect(result).toEqual(events);
            expect(eventRepo.find).toHaveBeenCalledWith({
                where: { status: 'upcoming' },
                order: { date: 'ASC' },
            });
        });

        it('should return all upcoming events for STAFF', async () => {
            const events = [
                { id: 1, status: 'upcoming' },
                { id: 2, status: 'upcoming' },
            ];
            eventRepo.find.mockResolvedValue(events);

            const result = await service.findUpcoming(1, 'STAFF');

            expect(result).toEqual(events);
            expect(eventRepo.find).toHaveBeenCalledWith({
                where: { status: 'upcoming' },
                order: { date: 'ASC' },
            });
        });
    });

    describe('findOne', () => {
        it('should find event by ID', async () => {
            const event = { id: 1, name: 'Event 1' };
            eventRepo.findOne.mockResolvedValue(event);

            const result = await service.findOne(1);

            expect(result).toEqual(event);
            expect(eventRepo.findOne).toHaveBeenCalledWith({
                where: { id: 1 },
            });
        });

        it('should return null when event not found', async () => {
            eventRepo.findOne.mockResolvedValue(null);

            const result = await service.findOne(999);

            expect(result).toBeNull();
        });
    });

    describe('update', () => {
        it('should update an event as ADMIN', async () => {
            const dto: UpdateEventDto = { name: 'Updated Event' } as any;
            const updated = { id: 1, ...dto, ownerId: 1 };

            eventRepo.findOne.mockResolvedValue(updated);
            eventRepo.update.mockResolvedValue({ affected: 1 });

            const result = await service.update(1, dto, 1, 'ADMIN');

            expect(result).toEqual(updated);
            expect(eventRepo.update).toHaveBeenCalledWith(
                1,
                expect.any(Object),
            );
        });

        it('should update an event as STAFF', async () => {
            const dto: UpdateEventDto = { name: 'Updated by Staff' } as any;
            const event = { id: 1, name: 'Original', ownerId: 2 };

            eventRepo.findOne.mockResolvedValue(event);
            eventRepo.update.mockResolvedValue({ affected: 1 });

            const result = await service.update(1, dto, 1, 'STAFF');

            expect(result).toEqual(event);
            expect(eventRepo.update).toHaveBeenCalledWith(
                1,
                expect.any(Object),
            );
        });

        it('should throw ForbiddenException when MEMBER tries to update any event', async () => {
            const dto: UpdateEventDto = { name: 'Unauthorized Update' } as any;
            const event = { id: 1, ownerId: 1 };
            eventRepo.findOne.mockResolvedValue(event);

            await expect(service.update(1, dto, 1, 'MEMBER')).rejects.toThrow(
                ForbiddenException,
            );
        });

        it('should parse date when provided', async () => {
            const dto: UpdateEventDto = { date: '2024-12-01' } as any;
            eventRepo.findOne.mockResolvedValue({
                id: 1,
                date: new Date(dto.date),
                ownerId: 1,
            });

            await service.update(1, dto, 1, 'ADMIN');

            expect(eventRepo.update).toHaveBeenCalledWith(
                1,
                expect.objectContaining({
                    date: expect.any(Date),
                }),
            );
        });

        it('should update mediaSourceUrl when provided', async () => {
            const dto: UpdateEventDto = {
                mediaSourceUrl: 'https://drive.google.com/drive/folders/123',
            } as any;
            const updated = { id: 1, ...dto, ownerId: 1 };

            eventRepo.findOne.mockResolvedValue(updated);

            const result = await service.update(1, dto, 1, 'ADMIN');

            expect(result).toEqual(updated);
            expect(eventRepo.update).toHaveBeenCalledWith(
                1,
                expect.objectContaining({
                    mediaSourceUrl:
                        'https://drive.google.com/drive/folders/123',
                }),
            );
        });
    });

    describe('registerAttendee', () => {
        it('should increment registered attendees', async () => {
            const event = {
                id: 1,
                registeredAttendees: 5,
            };
            eventRepo.findOne.mockResolvedValue(event);
            eventRepo.save.mockResolvedValue({
                ...event,
                registeredAttendees: 6,
            });

            const result = await service.registerAttendee(1);

            expect(result.registeredAttendees).toBe(6);
            expect(eventRepo.save).toHaveBeenCalled();
        });

        it('should handle null registered attendees', async () => {
            const event = { id: 1, registeredAttendees: null };
            eventRepo.findOne.mockResolvedValue(event);
            eventRepo.save.mockResolvedValue({
                ...event,
                registeredAttendees: 1,
            });

            const result = await service.registerAttendee(1);

            expect(result.registeredAttendees).toBe(1);
        });
    });

    describe('unregisterAttendee', () => {
        it('should decrement registered attendees', async () => {
            const event = {
                id: 1,
                registeredAttendees: 5,
            };
            eventRepo.findOne.mockResolvedValue(event);
            eventRepo.save.mockResolvedValue({
                ...event,
                registeredAttendees: 4,
            });

            const result = await service.unregisterAttendee(1);

            expect(result.registeredAttendees).toBe(4);
        });

        it('should not go below zero', async () => {
            const event = {
                id: 1,
                registeredAttendees: 0,
            };
            eventRepo.findOne.mockResolvedValue(event);

            const result = await service.unregisterAttendee(1);

            expect(result).toBeNull();
            expect(eventRepo.save).not.toHaveBeenCalled();
        });
    });

    describe('remove', () => {
        it('should delete an event as ADMIN', async () => {
            const event = { id: 1, ownerId: 1 };
            eventRepo.findOne.mockResolvedValue(event);

            await service.remove(1, 1, 'ADMIN');

            expect(dataSource.transaction).toHaveBeenCalled();
            expect(manager.update).toHaveBeenCalledWith(
                expect.any(Function),
                { eventId: 1 },
                { deletedAt: expect.any(Date) },
            );
        });

        it('should delete an event as STAFF', async () => {
            const event = { id: 1, ownerId: 2 };
            eventRepo.findOne.mockResolvedValue(event);

            await service.remove(1, 1, 'STAFF');

            expect(dataSource.transaction).toHaveBeenCalled();
        });

        it('should soft-delete associated media and activities', async () => {
            const event = { id: 1, ownerId: 1 };
            eventRepo.findOne.mockResolvedValue(event);

            await service.remove(1, 1, 'ADMIN');

            // 1. Guests
            // 2. QR Codes
            // 3. Media
            // 4. Activities
            // 5. Event itself
            expect(manager.update).toHaveBeenCalledTimes(5);
        });

        it('should throw ForbiddenException when MEMBER tries to delete any event', async () => {
            const event = { id: 1, ownerId: 1 };
            eventRepo.findOne.mockResolvedValue(event);

            await expect(service.remove(1, 1, 'MEMBER')).rejects.toThrow(
                ForbiddenException,
            );
        });
    });

    describe('createMedia', () => {
        it('should create media', async () => {
            const dto = {
                eventId: 1,
                title: 'Photo 1',
                url: 'https://example.com/photo.jpg',
            } as any;
            const created = { id: 1, ...dto };

            mediaRepo.create.mockReturnValue(created);
            mediaRepo.save.mockResolvedValue(created);

            const result = await service.createMedia(dto as any);

            expect(result).toEqual(created);
            expect(mediaRepo.save).toHaveBeenCalledWith(created);
        });
    });

    describe('findMediaByEventId', () => {
        it('should return paginated media', async () => {
            const media = [
                {
                    id: 1,
                    title: 'Photo',
                    eventId: 1,
                },
            ];

            const mockQb = {
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                skip: jest.fn().mockReturnThis(),
                take: jest.fn().mockReturnThis(),
                getManyAndCount: jest.fn().mockResolvedValue([media, 1]),
            };

            mediaRepo.createQueryBuilder.mockReturnValue(mockQb);

            const result = await service.findMediaByEventId(1, {
                page: 1,
                limit: 10,
            } as any);

            expect(result.data).toEqual(media);
            expect(result.total).toBe(1);
        });

        it('should filter by media type', async () => {
            const mockQb = {
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                skip: jest.fn().mockReturnThis(),
                take: jest.fn().mockReturnThis(),
                getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
            };

            mediaRepo.createQueryBuilder.mockReturnValue(mockQb);

            await service.findMediaByEventId(1, {
                page: 1,
                limit: 10,
                type: 'photo',
            } as any);

            expect(mockQb.andWhere).toHaveBeenCalledWith(
                'media.mediaType = :type',
                {
                    type: 'photo',
                },
            );
        });
    });

    describe('findMedia', () => {
        it('should find media by ID', async () => {
            const media = { id: 1, title: 'Photo' };
            mediaRepo.findOne.mockResolvedValue(media);

            const result = await service.findMedia(1);

            expect(result).toEqual(media);
        });
    });

    describe('updateMedia', () => {
        it('should update media', async () => {
            const updated = { id: 1, title: 'Updated Photo' };
            mediaRepo.findOne.mockResolvedValue(updated);

            const result = await service.updateMedia(1, {} as any);

            expect(result).toEqual(updated);
            expect(mediaRepo.update).toHaveBeenCalled();
        });
    });

    describe('removeMedia', () => {
        it('should delete media', async () => {
            await service.removeMedia(1);

            expect(mediaRepo.delete).toHaveBeenCalledWith(1);
        });
    });

    describe('createActivity', () => {
        it('should create activity', async () => {
            const created = {
                id: 1,
                eventId: 1,
                type: 'guest_added',
                title: 'Guest Added',
                description: 'Alice was added',
            };
            activityRepo.create.mockReturnValue(created);
            activityRepo.save.mockResolvedValue(created);

            const result = await service.createActivity(
                1,
                'guest_added',
                'Guest Added',
                'Alice was added',
            );

            expect(result).toEqual(created);
            expect(activityRepo.save).toHaveBeenCalledWith(created);
        });

        it('should include metadata', async () => {
            const created = {
                id: 1,
                eventId: 1,
                type: 'guest_added',
                metadata: '{"guestId":1}',
            };
            activityRepo.create.mockReturnValue(created);
            activityRepo.save.mockResolvedValue(created);

            await service.createActivity(
                1,
                'guest_added',
                'Guest Added',
                'Description',
                undefined,
                undefined,
                undefined,
                { guestId: 1 },
            );

            expect(activityRepo.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    metadata: '{"guestId":1}',
                }),
            );
        });

        it('should delete oldest activity when limit is exceeded', async () => {
            configService.get.mockReturnValue('2'); // Limit of 2
            activityRepo.count.mockResolvedValue(2); // Already have 2
            const oldest = { id: 10, title: 'Oldest' };
            activityRepo.findOne.mockResolvedValue(oldest);

            const created = { id: 13, title: 'New one' };
            activityRepo.create.mockReturnValue(created);
            activityRepo.save.mockResolvedValue(created);

            await service.createActivity(1, 'type', 'title', 'desc');

            expect(activityRepo.count).toHaveBeenCalled();
            expect(activityRepo.findOne).toHaveBeenCalledWith(
                expect.objectContaining({
                    order: { createdAt: 'ASC' },
                }),
            );
            expect(activityRepo.delete).toHaveBeenCalledWith(10);
            expect(activityRepo.save).toHaveBeenCalled();
        });
    });

    describe('findActivitiesByEventId', () => {
        it('should return paginated activities', async () => {
            const activities = [
                {
                    id: 1,
                    eventId: 1,
                    type: 'guest_added',
                },
            ];

            activityRepo.findAndCount.mockResolvedValue([activities, 1]);

            const result = await service.findActivitiesByEventId(1, {
                page: 1,
                limit: 10,
            } as any);

            expect(result.data).toEqual(activities);
            expect(result.total).toBe(1);
        });
    });

    describe('removeActivity', () => {
        it('should delete activity', async () => {
            await service.removeActivity(1);

            expect(activityRepo.delete).toHaveBeenCalledWith(1);
        });
    });

    describe('getEventSettings', () => {
        it('should return event settings', async () => {
            const event = {
                id: 1,
                name: 'My Event',
                status: 'upcoming',
                visibility: 'public',
                slug: 'my-event-slug',
                mediaSourceUrl: 'link',
                mediaFolderId: 'folder-url',
                scanPageTemplate: null,
                requireAuthForQrScan: false,
                urlHash: 'some-hash',
                urlStrategy: 'pure-slug',
            };
            eventRepo.findOne.mockResolvedValue(event);

            const result = await service.getEventSettings(1);

            expect(result).toEqual({
                eventId: 1,
                eventStatus: 'upcoming',
                eventVisibility: 'public',
                eventSlug: 'my-event-slug',
                mediaSourceUrl: 'link',
                mediaFolderId: 'folder-url',
                scanPageTemplate: null,
                scanPageTemplateId: null,
                requireAuthForQrScan: false,
                urlHash: 'some-hash',
                urlStrategy: 'pure-slug',
            });
        });

        it('should return default values when fields are missing', async () => {
            const event = {
                id: 1,
                name: 'Draft Event',
                status: 'draft',
            };
            eventRepo.findOne.mockResolvedValue(event);

            const result = await service.getEventSettings(1);

            expect(result.eventVisibility).toBe('private');
            expect(result.eventSlug).toBe('');
        });
    });

    describe('getEventStatistics', () => {
        it('should return event statistics', async () => {
            const event = {
                id: 1,
                registeredAttendees: 50,
            };
            eventRepo.findOne.mockResolvedValue(event);
            dataSource.manager.count.mockImplementation(
                (_entity: any, options: any) => {
                    const where = options?.where;
                    if (where?.status === 'Complete')
                        return Promise.resolve(15);
                    if (where?.status === 'Denied') return Promise.resolve(5);
                    return Promise.resolve(42);
                },
            );

            const result = await service.getEventStatistics(1);

            expect(result).toEqual({
                eventId: 1,
                totalGuests: 42,
                totalMedia: 15,
                activeQrCodes: 37,
                registeredAttendees: 50,
            });
        });
    });

    describe('getGlobalStatistics', () => {
        it('should return global statistics across all events', async () => {
            eventRepo.count.mockResolvedValueOnce(50); // total events
            eventRepo.count.mockResolvedValueOnce(12); // active events
            dataSource.manager.count
                .mockResolvedValueOnce(500) // total QR codes (QrCode)
                .mockResolvedValueOnce(300) // total guests (all)
                .mockResolvedValueOnce(150); // media delivered (Complete)

            const result = await service.getGlobalStatistics();

            expect(result).toEqual({
                totalEvents: 50,
                activeEvents: 12,
                totalQrCodes: 500,
                totalGuests: 300,
                mediaDelivered: 150,
            });
            expect(eventRepo.count).toHaveBeenCalledTimes(2);
            expect(dataSource.manager.count).toHaveBeenCalledTimes(3);
        });
    });

    describe('backfillUrlHashes', () => {
        it('should return updated count of 0 when no legacy events exist', async () => {
            eventRepo.find.mockResolvedValue([]);

            const result = await service.backfillUrlHashes();

            expect(result).toEqual({ updated: 0 });
            expect(eventRepo.find).toHaveBeenCalledWith({
                where: { urlHash: null },
                withDeleted: true,
            });
            expect(eventRepo.save).not.toHaveBeenCalled();
        });

        it('should assign UUID v7 hashes to legacy events without urlHash', async () => {
            const legacyEvents = [
                { id: 1, name: 'Legacy 1', urlHash: null },
                { id: 2, name: 'Legacy 2', urlHash: null },
                { id: 3, name: 'Legacy 3', urlHash: null },
            ];
            eventRepo.find.mockResolvedValue(legacyEvents);
            eventRepo.save.mockResolvedValue({});

            const result = await service.backfillUrlHashes();

            expect(result).toEqual({ updated: 3 });
            expect(eventRepo.save).toHaveBeenCalledTimes(3);
            // Each event should have received a urlHash
            expect(legacyEvents[0].urlHash).toBeDefined();
            expect(legacyEvents[1].urlHash).toBeDefined();
            expect(legacyEvents[2].urlHash).toBeDefined();
        });
    });
});
