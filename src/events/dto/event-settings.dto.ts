import {
    IsString,
    IsOptional,
    IsEnum,
    Matches,
    ValidateIf,
    IsBoolean,
    Length,
    MaxLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { EventStatus } from '../enums/event-status.enum';
import { UrlStrategy } from '../enums/url-strategy.enum';

export class EventSettingsDto {
    @ApiPropertyOptional({
        description: 'Event status',
        example: 'upcoming',
        enum: EventStatus,
    })
    @IsOptional()
    @IsEnum(EventStatus)
    eventStatus?: EventStatus;

    @ApiPropertyOptional({
        description: 'Event visibility',
        example: 'private',
        enum: ['public', 'private'],
    })
    @IsOptional()
    @IsEnum(['public', 'private'])
    eventVisibility?: string;

    @ApiPropertyOptional({
        description: 'Event URL slug (mutable, branding purposes)',
        example: 'smith-johnson-wedding',
    })
    @IsOptional()
    @ValidateIf((e) => e.eventSlug !== '')
    @IsString()
    @Length(3, 50)
    @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
        message:
            'Slug must contain only lowercase letters, numbers, and hyphens',
    })
    eventSlug?: string;

    @ApiPropertyOptional({
        description:
            'Full media source URL (e.g. Google Drive folder link) for input',
        example: 'https://photoshare.com/event123',
    })
    @IsOptional()
    @IsString()
    mediaSourceUrl?: string;

    @ApiPropertyOptional({
        description: 'URL format strategy for event page links',
        enum: UrlStrategy,
        example: UrlStrategy.PURE_SLUG,
    })
    @IsOptional()
    @IsEnum(UrlStrategy)
    urlStrategy?: UrlStrategy;

    @ApiPropertyOptional({
        description:
            'Whether JWT authentication is required for scanning the QR code',
        example: false,
    })
    @IsOptional()
    @IsBoolean()
    requireAuthForQrScan?: boolean;

    @ApiPropertyOptional({
        description:
            'Custom Handlebars HTML template for the QR scan page. Set to null to reset to default.',
        nullable: true,
    })
    @IsOptional()
    @ValidateIf((o) => o.scanPageTemplate !== null)
    @IsString()
    @MaxLength(65000, {
        message: 'scanPageTemplate must not exceed 65000 characters',
    })
    scanPageTemplate?: string | null;

    @ApiPropertyOptional({
        description:
            'ID of a built-in scan page template (e.g. "wedding-vi"). Set to null to clear. Mutually exclusive with scanPageTemplate.',
        nullable: true,
    })
    @IsOptional()
    @ValidateIf((o) => o.scanPageTemplateId !== null)
    @IsString()
    @MaxLength(100)
    scanPageTemplateId?: string | null;

    // NOTE: urlHash is intentionally absent from this DTO.
    // It is auto-generated on event creation (UUID v7) and is immutable.
    // QR links always use urlHash regardless of urlStrategy.
}
