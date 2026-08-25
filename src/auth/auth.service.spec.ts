import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('AuthService', () => {
    let service: AuthService;
    let usersService: UsersService;
    let jwtService: JwtService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuthService,
                {
                    provide: UsersService,
                    useValue: {
                        findOneByEmail: jest.fn(),
                    },
                },
                {
                    provide: JwtService,
                    useValue: {
                        sign: jest.fn(),
                    },
                },
            ],
        }).compile();

        service = module.get<AuthService>(AuthService);
        usersService = module.get<UsersService>(UsersService);
        jwtService = module.get<JwtService>(JwtService);
    });

    describe('validateUser', () => {
        it('should return user objects (without password) if password matches', async () => {
            const password = 'hashed_password';
            const user = { id: '1', email: 'test@example.com', password };
            const validateUser = { id: '1', email: 'test@example.com' };

            (usersService.findOneByEmail as jest.Mock).mockResolvedValue(user);
            (bcrypt.compare as jest.Mock).mockResolvedValue(true);

            const result = await service.validateUser(
                'test@example.com',
                'password',
            );

            expect(result).toEqual(validateUser);
            expect(usersService.findOneByEmail).toHaveBeenCalledWith(
                'test@example.com',
            );
            expect(bcrypt.compare).toHaveBeenCalledWith('password', password);
        });

        it('should return null if password does not match', async () => {
            const user = {
                id: '1',
                email: 'test@example.com',
                password: 'hashed_password',
            };

            (usersService.findOneByEmail as jest.Mock).mockResolvedValue(user);
            (bcrypt.compare as jest.Mock).mockResolvedValue(false);

            const result = await service.validateUser(
                'test@example.com',
                'wrongpassword',
            );

            expect(result).toBeNull();
        });

        it('should return null if user not found', async () => {
            (usersService.findOneByEmail as jest.Mock).mockResolvedValue(null);

            const result = await service.validateUser(
                'notfound@example.com',
                'password',
            );

            expect(result).toBeNull();
        });
    });

    describe('login', () => {
        it('should returning a login object with accessToken', async () => {
            const user = {
                id: '1',
                email: 'test@example.com',
                name: 'Test User',
                role: 'ADMIN',
            };
            const accessToken = 'signed_token';

            (jwtService.sign as jest.Mock).mockReturnValue(accessToken);

            const result = await service.login(user);

            expect(result).toEqual({
                accessToken,
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    role: user.role,
                },
            });
            expect(jwtService.sign).toHaveBeenCalledWith({
                email: user.email,
                sub: user.id,
                role: user.role,
            });
        });
    });
});
