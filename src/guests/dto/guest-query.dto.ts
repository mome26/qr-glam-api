import { IsOptional, IsEnum, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export enum GuestStatus {
    PENDING = 'Pending',
    COMPLETE = 'Complete',
    DENIED = 'Denied',
}

export class GuestQueryDto extends PaginationQueryDto {
    @ApiPropertyOptional({ enum: GuestStatus })
    @IsOptional()
    @IsEnum(GuestStatus)
    status?: GuestStatus | string;

    @ApiPropertyOptional()
    @IsOptional()
    role?: string;

    @ApiPropertyOptional()
    @IsOptional()
    group?: string;

    @ApiPropertyOptional()
    @IsOptional()
    search?: string;

    @ApiPropertyOptional()
    @IsOptional()
    orderBy?: string;

    @ApiPropertyOptional({
        description: 'If true, includes soft-deleted guests in the result',
        type: Boolean,
        default: false,
    })
    @IsOptional()
    @Transform(({ value }) => value === 'true' || value === true)
    @IsBoolean()
    includeDeleted?: boolean = false;

    @ApiPropertyOptional({
        description: 'If true, includes Denied guests (admin review mode)',
        type: Boolean,
        default: false,
    })
    @IsOptional()
    @Transform(({ value }) => value === 'true' || value === true)
    @IsBoolean()
    includeDenied?: boolean = false;
}
