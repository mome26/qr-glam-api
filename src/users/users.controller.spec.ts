import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

describe('UsersController', () => {
    let controller: UsersController;
    let service: UsersService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [UsersController],
            providers: [
                {
                    provide: UsersService,
                    useValue: {
                        findAll: jest.fn(),
                    },
                },
            ],
        }).compile();

        controller = module.get<UsersController>(UsersController);
        service = module.get<UsersService>(UsersService);
    });

    describe('findAll', () => {
        it('should return all users', async () => {
            const users = [
                { id: 1, email: 'user1@example.com' },
                { id: 2, email: 'user2@example.com' },
            ];
            (service.findAll as jest.Mock).mockResolvedValue(users);

            const result = await controller.findAll();

            expect(result).toBe(users);
            expect(service.findAll).toHaveBeenCalled();
        });
    });
});
