import { ApiProperty } from '@nestjs/swagger';

export class MediaSettingsStatusDto {
    @ApiProperty({
        description: 'Indicates if a Google API Key is configured',
        example: true,
    })
    googleApiKeyConfigured: boolean;
}
