import { Injectable, OnModuleInit } from '@nestjs/common';
import { UsersService } from './users/users.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AppService implements OnModuleInit {
    constructor(private readonly usersService: UsersService) {}

    async onModuleInit() {
        const users = await this.usersService.findAll();
        if (users.length === 0) {
            const hashedPassword = await bcrypt.hash('qr-glam-2026', 10);
            await this.usersService.create({
                email: 'admin@qr-glam.com',
                password: hashedPassword,
                name: 'Admin',
                role: 'ADMIN',
            });
            console.log(
                'Seeded default admin user: admin@qr-glam.com / qr-glam-2026',
            );
        }
    }

    getHello(): string {
        return 'Hello World!';
    }
}
