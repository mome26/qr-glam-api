import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GuestsService } from './guests.service';
import { GuestsController } from './guests.controller';
import { Guest } from './entities/guest.entity';
import { GuestRepository } from './repositories/guest.repository';
import { EventsModule } from '../events/events.module';
import { AuthModule } from '../auth/auth.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([Guest]),
        forwardRef(() => EventsModule),
        AuthModule,
    ],
    providers: [GuestsService, GuestRepository],
    controllers: [GuestsController],
    exports: [GuestsService, GuestRepository],
})
export class GuestsModule {}
