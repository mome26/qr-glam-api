import { IsArray, IsInt } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class BulkDeleteGuestsDto {
    @ApiProperty({
        type: [Number],
        description: 'Array of guest IDs to delete',
    })
    @IsArray()
    @IsInt({ each: true })
    guestIds: number[];
}
