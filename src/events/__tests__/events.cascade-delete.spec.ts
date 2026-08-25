import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { DataSource, Repository } from 'typeorm';
import { EventsService } from '../events.service';
import { Event } from '../entities/event.entity';
import { Guest } from '../../guests/entities/guest.entity';
import { Media } from '../entities/media.entity';
import { Activity } from '../entities/activity.entity';
import { QrCode } from '../../qr-codes/entities/qr-code.entity';
import { QrTemplate } from '../../qr-codes/entities/qr-template.entity';
import { User } from '../../users/entities/user.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { GuestsService } from '../../guests/guests.service';

describe('Cascade Delete', () => {
    let _service: EventsService;
    let guestsService: GuestsService;
    let dataSource: DataSource;
    let eventRepo: Repository<Event>;
    let guestRepo: Repository<Guest>;
    let qrCodeRepo: Repository<QrCode>;

    beforeAll(async () => {
        const moduleRef: TestingModule = await Test.createTestingModule({
            imports: [
                TypeOrmModule.forRoot({
                    type: 'better-sqlite3',
                    database: ':memory:',
                    dropSchema: true,
                    synchronize: true,
                    entities: [
                        Event,
                        Guest,
                        Media,
                        Activity,
                        QrCode,
                        QrTemplate,
                        User,
                    ],
                }),
                TypeOrmModule.forFeature([
                    Event,
                    Guest,
                    Media,
                    Activity,
                    QrCode,
                ]),
                ConfigModule.forRoot({ isGlobal: true }),
            ],
            providers: [EventsService, GuestsService],
        }).compile();

        _service = moduleRef.get<EventsService>(EventsService);
        guestsService = moduleRef.get<GuestsService>(GuestsService);
        dataSource = moduleRef.get<DataSource>(DataSource);
        eventRepo = moduleRef.get(getRepositoryToken(Event));
        guestRepo = moduleRef.get(getRepositoryToken(Guest));
        qrCodeRepo = moduleRef.get(getRepositoryToken(QrCode));
    });

    afterAll(async () => {
        if (dataSource) {
            await dataSource.destroy();
        }
    });

    it('should cascade delete QR code when guest is deleted', async () => {
        const event = await eventRepo.save({ name: 'Event', date: new Date() });
        const guest = await guestsService.createGuest(
            {
                name: 'Alice',
            },
            event.id,
        );

        await guestRepo.remove(guest);

        const deletedQrCode = await qrCodeRepo.findOne({
            where: { guestId: guest.id },
        });
        expect(deletedQrCode).toBeNull();
    });

    it('should cascade delete all guests and QR codes when event is deleted', async () => {
        const event = await eventRepo.save({ name: 'Event', date: new Date() });
        await guestsService.createGuest({ name: 'Alice' }, event.id);
        await guestsService.createGuest({ name: 'Bob' }, event.id);

        await eventRepo.remove(event);

        const orphanedGuests = await guestRepo.find({
            where: { eventId: event.id },
        });
        expect(orphanedGuests).toHaveLength(0);

        const orphanedQrCodes = await qrCodeRepo.find({
            where: { eventId: event.id },
        });
        expect(orphanedQrCodes).toHaveLength(0);
    });
});
