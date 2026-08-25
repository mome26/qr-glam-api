import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Repository, Not } from 'typeorm';
import {
    NotFoundException,
    ForbiddenException,
    ConflictException,
    BadRequestException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('UsersService', () => {
    let service: UsersService;
    let repo: Repository<User>;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UsersService,
                {
                    provide: getRepositoryToken(User),
                    useValue: {
                        findOne: jest.fn(),
                        find: jest.fn(),
                        create: jest.fn().mockImplementation((dto) => dto),
                        save: jest
                            .fn()
                            .mockImplementation((user) =>
                                Promise.resolve({ id: 1, ...user }),
                            ),
                        count: jest.fn(),
                        delete: jest.fn(),
                    },
                },
            ],
        }).compile();

        service = module.get<UsersService>(UsersService);
        repo = module.get<Repository<User>>(getRepositoryToken(User));
    });

    describe('findOneByEmail', () => {
        it('should find user by email', async () => {
            const user = { id: 1, email: 'test@example.com' };
            (repo.findOne as jest.Mock).mockResolvedValue(user);

            const result = await service.findOneByEmail('test@example.com');

            expect(result).toBe(user);
            expect(repo.findOne).toHaveBeenCalledWith({
                where: { email: 'test@example.com' },
            });
        });
    });

    describe('findOneById', () => {
        it('should find user by ID', async () => {
            const user = { id: 1, email: 'test@example.com' };
            (repo.findOne as jest.Mock).mockResolvedValue(user);

            const result = await service.findOneById(1);

            expect(result).toBe(user);
            expect(repo.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
        });
    });

    describe('findAll', () => {
        it('should return all users', async () => {
            const users = [{ id: 1, email: 'test@example.com' }];
            (repo.find as jest.Mock).mockResolvedValue(users);

            const result = await service.findAll();

            expect(result).toBe(users);
            expect(repo.find).toHaveBeenCalled();
        });
    });

    describe('create', () => {
        it('should create and save a new user', async () => {
            const userData = { email: 'new@example.com', name: 'New User' };
            const savedUser = { id: 1, ...userData };

            const result = await service.create(userData);

            expect(result).toEqual(savedUser);
            expect(repo.create).toHaveBeenCalledWith(userData);
            expect(repo.save).toHaveBeenCalled();
        });
    });

    describe('update', () => {
        it('should update user successfully', async () => {
            const user = { id: 1, email: 'test@example.com', name: 'Old Name' };
            const dto = { name: 'New Name' };
            (repo.findOne as jest.Mock).mockResolvedValue(user);

            const result = await service.update(1, dto, 'test@example.com');

            expect(result.name).toBe('New Name');
            expect(repo.save).toHaveBeenCalled();
        });

        it('should throw ConflictException if email already in use', async () => {
            const user = { id: 1, email: 'test@example.com' };
            const dto = { email: 'taken@example.com' };
            (repo.findOne as jest.Mock)
                .mockResolvedValueOnce(user) // for findOneById
                .mockResolvedValueOnce({ id: 2, email: 'taken@example.com' }); // for email check in save/findOne

            await expect(
                service.update(1, dto, 'test@example.com'),
            ).rejects.toThrow(ConflictException);
        });

        it('should throw ForbiddenException when updating another user', async () => {
            const user = { id: 1, email: 'test@example.com' };
            (repo.findOne as jest.Mock).mockResolvedValue(user);

            await expect(
                service.update(1, { name: 'New' }, 'other@example.com'),
            ).rejects.toThrow(ForbiddenException);
        });
    });

    describe('changePassword', () => {
        it('should change password successfully', async () => {
            const user = {
                id: 1,
                email: 'test@example.com',
                password: 'hashed_old',
            };
            (repo.findOne as jest.Mock).mockResolvedValue(user);
            (bcrypt.compare as jest.Mock).mockResolvedValue(true);
            (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_new');

            const result = await service.changePassword(
                1,
                { currentPassword: 'old', newPassword: 'new' },
                'test@example.com',
            );

            expect(result.message).toBe('Password changed successfully');
            expect(user.password).toBe('hashed_new');
            expect(repo.save).toHaveBeenCalled();
        });

        it('should throw BadRequestException if current password incorrect', async () => {
            const user = {
                id: 1,
                email: 'test@example.com',
                password: 'hashed_old',
            };
            (repo.findOne as jest.Mock).mockResolvedValue(user);
            (bcrypt.compare as jest.Mock).mockResolvedValue(false);

            await expect(
                service.changePassword(
                    1,
                    { currentPassword: 'wrong', newPassword: 'new' },
                    'test@example.com',
                ),
            ).rejects.toThrow(BadRequestException);
        });
    });

    describe('invite', () => {
        it('should invite user successfully', async () => {
            const admin = { id: 1, email: 'admin@example.com', role: 'ADMIN' };
            (repo.findOne as jest.Mock)
                .mockResolvedValueOnce(admin) // for findOneByEmail (inviter)
                .mockResolvedValueOnce(undefined); // for findOneByEmail (existing check)
            (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_temp');

            const result = await service.invite(
                { email: 'new@example.com', role: 'STAFF' as any },
                'admin@example.com',
            );

            expect(result.email).toBe('new@example.com');
            expect(result.role).toBe('STAFF');
            expect(repo.save).toHaveBeenCalled();
        });

        it('should throw ForbiddenException if inviter is not ADMIN', async () => {
            const user = { id: 1, email: 'staff@example.com', role: 'STAFF' };
            (repo.findOne as jest.Mock).mockResolvedValue(user);

            await expect(
                service.invite(
                    { email: 'new@example.com', role: 'STAFF' as any },
                    'staff@example.com',
                ),
            ).rejects.toThrow(ForbiddenException);
        });
    });

    describe('updateRole', () => {
        it('should update role successfully', async () => {
            const admin = { id: 1, email: 'admin@example.com', role: 'ADMIN' };
            const user = { id: 2, email: 'user@example.com', role: 'MEMBER' };
            (repo.findOne as jest.Mock)
                .mockResolvedValueOnce(admin) // findOneByEmail
                .mockResolvedValueOnce(user); // findOneById

            const result = await service.updateRole(
                2,
                { role: 'STAFF' as any },
                'admin@example.com',
            );

            expect(user.role).toBe('STAFF');
            expect(repo.save).toHaveBeenCalled();
        });
    });

    describe('remove', () => {
        it('should remove user successfully', async () => {
            const admin = { id: 1, email: 'admin@example.com', role: 'ADMIN' };
            const userToDelete = {
                id: 2,
                email: 'user@example.com',
                role: 'MEMBER',
            };
            (repo.findOne as jest.Mock)
                .mockResolvedValueOnce(admin) // findOneByEmail
                .mockResolvedValueOnce(userToDelete); // findOneById
            (repo.delete as jest.Mock).mockResolvedValue({ affected: 1 });

            const result = await service.remove(2, 'admin@example.com');

            expect(result.success).toBe(true);
            expect(repo.delete).toHaveBeenCalledWith(2);
        });

        it('should prevent self-deletion', async () => {
            const admin = { id: 1, email: 'admin@example.com', role: 'ADMIN' };
            (repo.findOne as jest.Mock).mockResolvedValueOnce(admin);

            await expect(
                service.remove(1, 'admin@example.com'),
            ).rejects.toThrow(BadRequestException);
        });

        it('should prevent deleting last admin', async () => {
            const admin = { id: 1, email: 'admin@example.com', role: 'ADMIN' };
            const otherAdmin = {
                id: 2,
                email: 'other@example.com',
                role: 'ADMIN',
            };
            (repo.findOne as jest.Mock)
                .mockResolvedValueOnce(admin) // findOneByEmail (admin)
                .mockResolvedValueOnce(otherAdmin); // findOneById (to delete)
            (repo.count as jest.Mock).mockResolvedValue(1);

            await expect(
                service.remove(2, 'admin@example.com'),
            ).rejects.toThrow(BadRequestException);
        });
    });
});
