import { IsUrl, ValidateIf } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateRedirectLinkDto {
    @ApiPropertyOptional({
        description:
            'The new redirect target URL. Leave empty to remove redirect and fall back to Media & Storage.',
        example: 'https://new-destination.com/page',
    })
    @ValidateIf(
        (o: UpdateRedirectLinkDto) =>
            o.redirectLink !== null &&
            o.redirectLink !== '' &&
            o.redirectLink !== undefined,
    )
    @IsUrl(
        {
            require_protocol: true,
            require_valid_protocol: true,
            protocols: ['http', 'https'],
        },
        { message: 'Redirect link must be a valid HTTP/HTTPS URL' },
    )
    redirectLink?: string | null;
}
