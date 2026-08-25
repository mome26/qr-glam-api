import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { UsersModule } from '../users/users.module';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AdminGuard } from './guards/admin.guard';
import { AdminStaffGuard } from './guards/admin-staff.guard';
import { OptionalJwtAuthGuard } from './guards/optional-jwt.guard';

@Module({
    imports: [
        UsersModule,
        PassportModule,
        JwtModule.registerAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: async (configService: ConfigService) => ({
                secret: configService.get<string>('JWT_SECRET'),
                signOptions: { expiresIn: '24h' },
            }),
        }),
    ],
    providers: [
        AuthService,
        JwtStrategy,
        AdminGuard,
        AdminStaffGuard,
        OptionalJwtAuthGuard,
    ],
    controllers: [AuthController],
    exports: [AuthService, AdminGuard, AdminStaffGuard, OptionalJwtAuthGuard],
})
export class AuthModule {}
