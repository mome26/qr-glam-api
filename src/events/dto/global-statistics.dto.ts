import { ApiProperty } from '@nestjs/swagger';

export class GlobalStatisticsDto {
    @ApiProperty({ example: 10 })
    totalEvents: number;

    @ApiProperty({ example: 5 })
    activeEvents: number;

    @ApiProperty({ example: 1000 })
    totalQrCodes: number;

    @ApiProperty({ example: 500 })
    totalGuests: number;

    @ApiProperty({ example: 250 })
    mediaDelivered: number;
}
