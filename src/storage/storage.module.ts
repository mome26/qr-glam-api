import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StorageSettings } from './entities/storage-settings.entity';
import { StorageSettingsService } from './storage-settings.service';
import { StorageSettingsController } from './storage-settings.controller';
import { GoogleDriveProvider } from './providers/google-drive.provider';

@Global()
@Module({
    imports: [TypeOrmModule.forFeature([StorageSettings])],
    controllers: [StorageSettingsController],
    providers: [StorageSettingsService, GoogleDriveProvider],
    exports: [StorageSettingsService, GoogleDriveProvider],
})
export class StorageModule {}
