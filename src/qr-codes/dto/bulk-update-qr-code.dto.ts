import { IsArray, IsInt, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class BulkUpdateQrCodeDto {
    @ApiProperty({
        description: 'Array of QR code IDs to update',
        example: [1, 2, 3],
    })
    @IsArray()
    @IsInt({ each: true })
    qrCodeIds: number[];

    @ApiProperty({
        description:
            'Template ID to assign. If null, the template will be unassigned.',
        example: 1,
        required: false,
    })
    @IsOptional()
    @IsInt()
    templateId?: number | null;
}
