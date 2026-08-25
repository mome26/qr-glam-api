import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Event } from '../events/entities/event.entity';
import { QrCode } from '../qr-codes/entities/qr-code.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Event, QrCode])],
    providers: [],
    exports: [],
})
export class SharedModule {}
