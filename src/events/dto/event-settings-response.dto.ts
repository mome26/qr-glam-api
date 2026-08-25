import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EventStatus } from '../enums/event-status.enum';
import { UrlStrategy } from '../enums/url-strategy.enum';

export class EventSettingsResponseDto {
    @ApiProperty({ example: 1 })
    eventId: number;

    @ApiProperty({ example: 'upcoming', enum: EventStatus })
    eventStatus: EventStatus;

    @ApiProperty({ example: 'public', enum: ['public', 'private'] })
    eventVisibility: string;

    @ApiProperty({ example: 'smith-johnson-wedding' })
    eventSlug: string;

    @ApiPropertyOptional({
        description: 'Full media source URL input',
        example: 'https://photoshare.com/event123',
        nullable: true,
    })
    mediaSourceUrl?: string;

    @ApiPropertyOptional({
        description: 'Extracted folder ID for backend media resolution',
        example: '1AXmDus_1etoItdou_gJZx6LXUnwxoeiS',
        nullable: true,
    })
    mediaFolderId?: string;

    @ApiProperty({
        description: 'URL format strategy for event and QR code links',
        enum: UrlStrategy,
        example: UrlStrategy.PURE_SLUG,
    })
    urlStrategy: UrlStrategy;

    @ApiPropertyOptional({
        description: 'UUID v7 identifier for private URL access',
        example: '018efa3b-1234-7abc-9def-0123456789ab',
        nullable: true,
    })
    urlHash?: string;

    @ApiProperty({
        description:
            'Whether JWT authentication is required for scanning the QR code',
        example: false,
    })
    requireAuthForQrScan: boolean;

    @ApiPropertyOptional({
        description:
            'Custom Handlebars HTML template for the QR scan page. NULL means default template.',
        nullable: true,
    })
    scanPageTemplate?: string | null;

    @ApiPropertyOptional({
        description:
            'ID of a built-in scan page template selected without modification.',
        nullable: true,
    })
    scanPageTemplateId?: string | null;
}
