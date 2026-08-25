import {
    IsOptional,
    IsBoolean,
    IsInt,
    IsUrl,
    ValidateIf,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateQrCodeDto {
    @ApiPropertyOptional({
        description: 'Whether this QR has been scanned/assigned',
        example: true,
    })
    @IsOptional()
    @IsBoolean()
    isUsed?: boolean;

    @ApiPropertyOptional({
        description: 'Guest ID this QR is assigned to',
        example: 1,
    })
    @IsOptional()
    @IsInt()
    guestId?: number;

    @ApiPropertyOptional({
        description:
            'Optional override redirect target. Send empty string or null to remove redirect.',
        example: 'https://custom.com',
    })
    @ValidateIf(
        (o: UpdateQrCodeDto) =>
            o.redirectLink !== null && o.redirectLink !== '',
    )
    @IsUrl()
    redirectLink?: string | null;

    @ApiPropertyOptional({
        description: 'Guest-specific media URL override',
        example: 'https://drive.google.com/file/d/abc123/view',
    })
    @IsOptional()
    @IsUrl()
    customMediaUrl?: string;

    @ApiPropertyOptional({
        description: 'Template ID for the QR code',
        example: 1,
    })
    @IsOptional()
    @IsInt()
    templateId?: number;
}
