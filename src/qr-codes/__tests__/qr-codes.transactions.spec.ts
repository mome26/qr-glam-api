import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QrCode } from '../entities/qr-code.entity';
import { Guest } from '../../guests/entities/guest.entity';
import { Event } from '../../events/entities/event.entity';
import { QrTemplate } from '../entities/qr-template.entity';
import { User } from '../../users/entities/user.entity';
import { Media } from '../../events/entities/media.entity';
import { Activity } from '../../events/entities/activity.entity';

describe('QrCodes Transactions', () => {
    let dataSource: DataSource;

    beforeAll(async () => {
        const module: TestingModule = await Test.createTestingModule({
            imports: [
                TypeOrmModule.forRoot({
                    type: 'better-sqlite3',
                    database: ':memory:',
                    dropSchema: true,
                    synchronize: true,
                    entities: [
                        QrCode,
                        Guest,
                        Event,
                        QrTemplate,
                        User,
                        Media,
                        Activity,
                    ],
                }),
                TypeOrmModule.forFeature([
                    QrCode,
                    Guest,
                    Event,
                    QrTemplate,
                    User,
                    Media,
                    Activity,
                ]),
            ],
        }).compile();

        dataSource = module.get<DataSource>(DataSource);
    });

    afterAll(async () => {
        await dataSource.destroy();
    });

    it('should rollback transaction on failure', async () => {
        const event = await dataSource.manager.save(Event, {
            name: 'Test Event',
            date: new Date(),
        });

        try {
            await dataSource.transaction(async (manager) => {
                await manager.save(Guest, {
                    name: 'Atomic Guest',
                    eventId: event.id,
                });

                // Trigger failure
                throw new Error('Forced failure');
            });
        } catch (e) {
            expect(e.message).toBe('Forced failure');
        }

        const guests = await dataSource.manager.find(Guest);
        expect(guests).toHaveLength(0);
    });
});
