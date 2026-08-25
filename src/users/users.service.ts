import {
    Injectable,
    BadRequestException,
    NotFoundException,
    ForbiddenException,
    ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import { User } from './entities/user.entity';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { InviteUserDto } from './dto/invite-user.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
    constructor(
        @InjectRepository(User)
        private usersRepository: Repository<User>,
    ) {}

    findOneByEmail(email: string): Promise<User | undefined> {
        return this.usersRepository.findOne({ where: { email } });
    }

    findOneById(id: number): Promise<User | undefined> {
        return this.usersRepository.findOne({ where: { id } });
    }

    findAll(): Promise<User[]> {
        return this.usersRepository.find();
    }

    async create(userData: Partial<User>): Promise<User> {
        const user = this.usersRepository.create(userData);
        return this.usersRepository.save(user);
    }

    async update(
        id: number,
        dto: UpdateUserDto,
        currentUserEmail: string,
    ): Promise<User> {
        const user = await this.findOneById(id);
        if (!user) {
            throw new NotFoundException('User not found');
        }

        // Validate self-update only
        if (user.email !== currentUserEmail) {
            throw new ForbiddenException(
                'You can only update your own profile',
            );
        }

        if (dto.email && dto.email !== user.email) {
            const existing = await this.usersRepository.findOne({
                where: { email: dto.email, id: Not(user.id) },
            });
            if (existing) {
                throw new ConflictException('Email already in use');
            }
        }

        Object.assign(user, dto);
        return this.usersRepository.save(user);
    }

    async changePassword(
        id: number,
        dto: ChangePasswordDto,
        currentUserEmail: string,
    ): Promise<{ message: string }> {
        const user = await this.findOneById(id);
        if (!user) {
            throw new NotFoundException('User not found');
        }

        if (user.email !== currentUserEmail) {
            throw new ForbiddenException(
                'You can only change your own password',
            );
        }

        const isMatch = await bcrypt.compare(
            dto.currentPassword,
            user.password,
        );
        if (!isMatch) {
            throw new BadRequestException('Incorrect current password');
        }

        user.password = await bcrypt.hash(dto.newPassword, 10);
        user.isDefaultPassword = false;
        await this.usersRepository.save(user);

        return { message: 'Password changed successfully' };
    }

    async invite(dto: InviteUserDto, inviterEmail: string): Promise<User> {
        const inviter = await this.findOneByEmail(inviterEmail);
        if (!inviter || inviter.role !== 'ADMIN') {
            throw new ForbiddenException('Only admins can invite users');
        }

        const existing = await this.findOneByEmail(dto.email);
        if (existing) {
            throw new ConflictException('User with this email already exists');
        }

        // Default password for invited users (intentionally weak to force password change on first login)
        const DEFAULT_PASSWORD = '123456789';
        const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10);

        const user = this.usersRepository.create({
            email: dto.email,
            role: dto.role,
            password: hashedPassword,
            isDefaultPassword: true,
        });

        return this.usersRepository.save(user);
    }

    async updateRole(
        id: number,
        dto: UpdateUserRoleDto,
        adminEmail: string,
    ): Promise<User> {
        const admin = await this.findOneByEmail(adminEmail);
        if (!admin || admin.role !== 'ADMIN') {
            throw new ForbiddenException('Only admins can update user roles');
        }

        const user = await this.findOneById(id);
        if (!user) {
            throw new NotFoundException('User not found');
        }

        user.role = dto.role;
        return this.usersRepository.save(user);
    }

    async remove(
        id: number,
        adminEmail: string,
    ): Promise<{ success: boolean }> {
        const admin = await this.findOneByEmail(adminEmail);
        if (!admin || admin.role !== 'ADMIN') {
            throw new ForbiddenException('Only admins can remove users');
        }

        if (id === admin.id) {
            throw new BadRequestException('You cannot delete yourself');
        }

        const userToDelete = await this.findOneById(id);
        if (!userToDelete) {
            throw new NotFoundException('User not found');
        }

        if (userToDelete.role === 'ADMIN') {
            const adminCount = await this.usersRepository.count({
                where: { role: 'ADMIN' },
            });
            if (adminCount <= 1) {
                throw new BadRequestException('Cannot delete the last admin');
            }
        }

        await this.usersRepository.delete(id);
        return { success: true };
    }
}
