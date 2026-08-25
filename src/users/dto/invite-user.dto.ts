import { IsEmail, IsEnum, IsOptional } from 'class-validator';

export class InviteUserDto {
    @IsEmail()
    email: string;

    @IsOptional()
    @IsEnum(['ADMIN', 'STAFF', 'MEMBER'])
    role?: string;
}
