import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StorageSettings } from './entities/storage-settings.entity';
import { MediaSettingsStatusDto } from './dto/media-settings-status.dto';

@Injectable()
export class StorageSettingsService {
    constructor(
        @InjectRepository(StorageSettings)
        private settingsRepo: Repository<StorageSettings>,
    ) {}

    async getSettings(): Promise<StorageSettings> {
        let settings = await this.settingsRepo.findOne({ where: { id: 1 } });
        if (!settings) {
            // Create default on first access
            settings = this.settingsRepo.create({ id: 1 });
            await this.settingsRepo.save(settings);
        }
        return settings;
    }

    async getSettingsStatus(): Promise<MediaSettingsStatusDto> {
        const isConfigured =
            !!process.env.GOOGLE_API_KEY &&
            process.env.GOOGLE_API_KEY.trim().length > 0;
        return {
            googleApiKeyConfigured: isConfigured,
        };
    }
}
