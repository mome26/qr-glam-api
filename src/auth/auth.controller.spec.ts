import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UnauthorizedException } from '@nestjs/common';
import { LoginDto } from './dto/login.dto';

describe('AuthController', () => {
    let controller: AuthController;
    let authService: AuthService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [AuthController],
            providers: [
                {
                    provide: AuthService,
                    useValue: {
                        validateUser: jest.fn(),
                        login: jest.fn(),
                    },
                },
            ],
        }).compile();

        controller = module.get<AuthController>(AuthController);
        authService = module.get<AuthService>(AuthService);
    });

    describe('login', () => {
        it('should return a login result if credentials are valid', async () => {
            const loginDto: LoginDto = {
                email: 'test@example.com',
                password: 'password123',
            };
            const user = {
                id: '1',
                email: 'test@example.com',
                name: 'Test User',
            };
            const loginResult = { accessToken: 'token', user };

            (authService.validateUser as jest.Mock).mockResolvedValue(user);
            (authService.login as jest.Mock).mockResolvedValue(loginResult);

            const result = await controller.login(loginDto);

            expect(result).toBe(loginResult);
            expect(authService.validateUser).toHaveBeenCalledWith(
                loginDto.email,
                loginDto.password,
            );
            expect(authService.login).toHaveBeenCalledWith(user);
        });

        it('should throw UnauthorizedException if credentials are invalid', async () => {
            const loginDto: LoginDto = {
                email: 'wrong@example.com',
                password: 'wrongpassword',
            };

            (authService.validateUser as jest.Mock).mockResolvedValue(null);

            await expect(controller.login(loginDto)).rejects.toThrow(
                UnauthorizedException,
            );
        });
    });

    describe('getProfile', () => {
        it('should return req.user', () => {
            const req = { user: { id: '1', email: 'test@example.com' } };
            expect(controller.getProfile(req)).toBe(req.user);
        });
    });
});
