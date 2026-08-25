import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { StorageSettingsService } from './storage-settings.service';
import { MediaSettingsStatusDto } from './dto/media-settings-status.dto';

@ApiTags('Media Provider')
@Controller('settings/media')
export class StorageSettingsController {
    constructor(private readonly settingsService: StorageSettingsService) {}

    @Get()
    @ApiOperation({ summary: 'Get Google Drive configuration status' })
    @ApiResponse({ type: MediaSettingsStatusDto })
    getMediaSettings() {
        return this.settingsService.getSettingsStatus();
    }
}
