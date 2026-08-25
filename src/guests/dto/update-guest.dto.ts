import { PartialType, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateGuestDto } from './create-guest.dto';

export class UpdateGuestDto extends PartialType(CreateGuestDto) {
    @ApiPropertyOptional({
        enum: ['Pending', 'Complete', 'Denied'],
        description: 'Current status of the guest in the lifecycle',
    })
    @IsOptional()
    @IsEnum(['Pending', 'Complete', 'Denied'], {
        message: 'status must be one of: Pending, Complete, Denied',
    })
    status?: 'Pending' | 'Complete' | 'Denied';

    @ApiPropertyOptional({
        description:
            'Template ID to assign to the guest QR code (null to remove)',
        example: 1,
    })
    @IsOptional()
    @IsInt()
    @Type(() => Number)
    templateId?: number | null;
}
