import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PaginatedResponseDto<T> {
    @ApiProperty()
    data: T[];

    @ApiProperty()
    total: number;

    @ApiProperty()
    page: number;

    @ApiProperty()
    limit: number;

    @ApiProperty()
    totalPages: number;

    @ApiPropertyOptional()
    totalDenied?: number;

    static from<T>(
        data: T[],
        total: number,
        page: number,
        limit: number,
        totalDenied?: number,
    ): PaginatedResponseDto<T> {
        return {
            data,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
            totalDenied,
        };
    }
}
