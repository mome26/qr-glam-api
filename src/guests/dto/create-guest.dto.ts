import { IsEmail, IsEnum, IsOptional, IsString, Length } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateGuestDto {
    @ApiProperty({
        description: 'Full name of the guest',
        example: 'John Doe',
    })
    @IsString()
    @Length(1, 255)
    name: string;

    @ApiPropertyOptional({
        description: 'Email address of the guest',
        example: 'john.doe@example.com',
    })
    @IsOptional()
    @IsEmail()
    email?: string;

    @ApiPropertyOptional({
        description: 'Phone number of the guest',
        example: '+1234567890',
    })
    @IsOptional()
    @IsString()
    phone?: string;

    @ApiPropertyOptional({
        description: 'Role of the guest (e.g., VIP, Speaker)',
        example: 'VIP',
    })
    @IsOptional()
    @IsString()
    role?: string;

    @ApiPropertyOptional({
        description: 'Group or table assignment for the guest',
        example: 'Table 5',
    })
    @IsOptional()
    @IsString()
    group?: string;

    @ApiPropertyOptional({
        description: 'Current status of the guest in the lifecycle',
        enum: ['Pending', 'Complete', 'Denied'],
        example: 'Pending',
        default: 'Pending',
    })
    @IsOptional()
    @IsEnum(['Pending', 'Complete', 'Denied'], {
        message: 'status must be one of: Pending, Complete, Denied',
    })
    status?: 'Pending' | 'Complete' | 'Denied';
}
