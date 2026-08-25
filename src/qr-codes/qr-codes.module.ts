import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QrCodesController } from './qr-codes.controller';
import { QrCodesService } from './qr-codes.service';
import { QrCode } from './entities/qr-code.entity';
import { QrTemplate } from './entities/qr-template.entity';
import { Event } from '../events/entities/event.entity';
import { Guest } from '../guests/entities/guest.entity';
import { StorageModule } from '../storage/storage.module';
import { EventsModule } from '../events/events.module';
import { AuthModule } from '../auth/auth.module';
import { TemplateCacheService } from './services/template-cache.service';

@Module({
    imports: [
        TypeOrmModule.forFeature([QrCode, QrTemplate, Event, Guest]),
        StorageModule,
        EventsModule,
        AuthModule,
    ],
    controllers: [QrCodesController],
    providers: [TemplateCacheService, QrCodesService],
    exports: [QrCodesService, TemplateCacheService],
})
export class QrCodesModule {}
