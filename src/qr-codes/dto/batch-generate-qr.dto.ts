import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class BatchGenerateQrDto {
    @ApiProperty({
        description: 'Number of QR codes to generate',
        example: 100,
        minimum: 1,
        maximum: 100,
    })
    @IsInt()
    @Min(1)
    @Max(Number(process.env.MAX_BATCH_QR_COUNT) || 100)
    count: number;

    @ApiProperty({
        description: 'Optional template ID to apply to all generated QR codes',
        example: 1,
        required: false,
    })
    @IsOptional()
    @IsInt()
    templateId?: number;
}
