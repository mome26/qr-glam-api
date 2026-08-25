import { IsInt, IsOptional, IsUrl } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateQrCodeDto {
    @ApiProperty({
        description: 'Guest ID this QR is assigned to',
        example: 1,
    })
    @IsInt()
    guestId: number;

    @ApiProperty({
        description: 'Event ID including host and guests',
        example: 1,
    })
    @IsInt()
    eventId: number;

    @ApiPropertyOptional({
        description: 'Optional override redirect target',
        example: 'https://custom.com',
    })
    @IsOptional()
    @IsUrl(
        {
            require_protocol: true,
            require_valid_protocol: true,
            protocols: ['http', 'https'],
        },
        { message: 'Redirect link must be a valid HTTP/HTTPS URL' },
    )
    redirectLink?: string;

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
