import { IsOptional, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

import { EventStatus } from '../enums/event-status.enum';

export class EventQueryDto extends PaginationQueryDto {
    @ApiPropertyOptional({ enum: EventStatus })
    @IsOptional()
    @IsEnum(EventStatus)
    status?: EventStatus | string;

    @ApiPropertyOptional()
    @IsOptional()
    dateRangeStart?: string;

    @ApiPropertyOptional()
    @IsOptional()
    dateRangeEnd?: string;
}
