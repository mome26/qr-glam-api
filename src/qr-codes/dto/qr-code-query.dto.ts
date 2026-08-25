import { IsOptional, IsBoolean, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class QrCodeQueryDto extends PaginationQueryDto {
    @ApiPropertyOptional({
        description: 'Search by guest name or numeric ID',
    })
    @IsOptional()
    @IsString()
    search?: string;

    @ApiPropertyOptional({
        description:
            'Filter by assignment status (true = assigned, false = unassigned)',
        type: Boolean,
    })
    @IsOptional()
    @Transform(({ value }) => value === 'true' || value === true)
    @IsBoolean()
    assigned?: boolean;

    @IsOptional()
    @Transform(({ value }) => {
        if (typeof value === 'string') {
            return value
                .split(',')
                .map((s) => Number(s.trim()))
                .filter((n) => !isNaN(n));
        }
        return value;
    })
    ids?: number[];

    @ApiPropertyOptional({
        description: 'If true, includes soft-deleted QR codes in the result',
        type: Boolean,
        default: false,
    })
    @IsOptional()
    @Transform(({ value }) => value === 'true' || value === true)
    @IsBoolean()
    includeDeleted?: boolean = false;
}
