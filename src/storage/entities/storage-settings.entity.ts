import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    UpdateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

@Entity('storage_settings')
export class StorageSettings {
    @PrimaryGeneratedColumn()
    id: number;

    @ApiProperty({ description: 'Google API Key' })
    @Column({ select: false, nullable: true })
    googleApiKey: string;

    @UpdateDateColumn()
    updatedAt: Date;
}
