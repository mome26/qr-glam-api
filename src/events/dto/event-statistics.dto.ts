import { ApiProperty } from '@nestjs/swagger';

export class EventStatisticsDto {
    @ApiProperty({ example: 1 })
    eventId: number;

    @ApiProperty({ example: 100 })
    totalGuests: number;

    @ApiProperty({ example: 45 })
    totalMedia: number;

    @ApiProperty({ example: 100 })
    activeQrCodes: number;

    @ApiProperty({ example: 50 })
    registeredAttendees: number;
}
