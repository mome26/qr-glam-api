import { IsArray, IsEnum, IsOptional, IsString, IsInt } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { GuestStatus } from './guest-query.dto';

export class BulkUpdateGuestsDto {
    @ApiProperty({
        type: [Number],
        description: 'Array of guest IDs to update',
    })
    @IsArray()
    @IsInt({ each: true })
    guestIds: number[];

    @ApiPropertyOptional({ enum: GuestStatus })
    @IsOptional()
    @IsEnum(GuestStatus)
    status?: GuestStatus | string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    role?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    group?: string;
}
