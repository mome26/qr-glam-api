import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { GuestsService } from '../guests.service';
import { Guest } from '../entities/guest.entity';
import { EventsService } from '../../events/events.service';

describe('GuestsService Create with QR', () => {
    let service: GuestsService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                GuestsService,
                {
                    provide: getRepositoryToken(Guest),
                    useClass: Repository,
                },
                {
                    provide: DataSource,
                    useValue: {
                        transaction: jest.fn(),
                    },
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

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    // Further tests will be implemented after the service is ready
    // or as failing tests if TDD is strictly required.
});
