import { IsOptional, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export enum MediaType {
    PHOTO = 'photo',
    VIDEO = 'video',
    DOCUMENT = 'document',
}

export class MediaQueryDto extends PaginationQueryDto {
    @ApiPropertyOptional({ enum: MediaType })
    @IsOptional()
    @IsEnum(MediaType)
    type?: MediaType | string;
}
