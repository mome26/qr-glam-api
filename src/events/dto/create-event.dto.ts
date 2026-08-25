import {
    IsString,
    IsOptional,
    IsDateString,
    IsInt,
    IsEnum,
    IsUrl,
    Matches,
    ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EventStatus } from '../enums/event-status.enum';
import { UrlStrategy } from '../enums/url-strategy.enum';

export class CreateEventDto {
    @ApiProperty({
        description: 'Event name/title',
        example: 'Annual Gala 2024',
    })
    @IsString()
    name: string;

    @ApiPropertyOptional({
        description: 'Event description',
        example: 'A grand celebration event',
    })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiProperty({
        description: 'Event date and time (ISO 8601)',
        example: '2024-12-31T18:00:00.000Z',
    })
    @IsDateString()
    date: string;

    @ApiPropertyOptional({
        description: 'Event location/venue',
        example: 'Grand Ballroom, Downtown Hotel',
    })
    @IsOptional()
    @IsString()
    location?: string;

    @ApiPropertyOptional({
        description: 'Associated QR code ID',
        example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    })
    @IsOptional()
    @IsString()
    qrCodeId?: string;

    @ApiPropertyOptional({
        description: 'Event image/banner URL',
        example: 'https://api.example.com/events/123/banner.jpg',
    })
    @IsOptional()
    @IsString()
    imageUrl?: string;

    @ApiPropertyOptional({
        description: 'Maximum number of attendees',
        example: 500,
    })
    @IsOptional()
    @IsInt()
    maxAttendees?: number;

    @ApiPropertyOptional({
        description: 'Event status',
        example: 'upcoming',
        enum: EventStatus,
    })
    @IsOptional()
    @IsEnum(EventStatus)
    status?: EventStatus;

    @ApiPropertyOptional({
        description:
            'Full media source URL (e.g. Google Drive folder link) for input',
        example: 'https://drive.google.com/drive/folders/1234',
    })
    @IsOptional()
    @IsUrl({}, { message: 'mediaSourceUrl must be a valid URL' })
    mediaSourceUrl?: string;

    @ApiPropertyOptional({
        description: 'URL format strategy for event and QR code links',
        enum: UrlStrategy,
        example: UrlStrategy.PURE_SLUG,
    })
    @IsOptional()
    @IsEnum(UrlStrategy)
    urlStrategy?: UrlStrategy;

    @ApiPropertyOptional({
        description:
            'UUID v7 identifier for private URL access (auto-generated if not provided, immutable after creation)',
        example: '018efa3b-1234-7abc-9def-0123456789ab',
    })
    @IsOptional()
    @ValidateIf(
        (o) =>
            o.urlHash !== undefined && o.urlHash !== null && o.urlHash !== '',
    )
    @IsString()
    @Matches(
        /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
        {
            message:
                'urlHash must be a valid UUID v7 format (e.g., 018efa3b-1234-7abc-9def-0123456789ab)',
        },
    )
    urlHash?: string;
}
