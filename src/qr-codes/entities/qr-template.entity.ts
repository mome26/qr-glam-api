import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    OneToMany,
    Index,
    JoinColumn,
} from 'typeorm';
import { Event } from '../../events/entities/event.entity';
import { QrCode } from './qr-code.entity';

@Entity('qr_templates')
@Index(['eventId', 'name'], { unique: true })
export class QrTemplate {
    @PrimaryGeneratedColumn()
    id: number;

    @Column('integer')
    eventId: number;

    @Column('varchar', { length: 100 })
    name: string;

    @Column('text', { nullable: true })
    backgroundImage: string;

    @Column('int')
    qrPositionX: number;

    @Column('int')
    qrPositionY: number;

    @Column('int')
    qrSize: number;

    @Column({ default: false })
    showNumericIdBelow: boolean;

    @Column('int', { default: 50 })
    numericIdSize: number;

    @Column({ default: 'white' })
    textColor: string;

    @Column('simple-json', { nullable: true })
    customTexts: {
        id: string;
        content: string;
        size: number;
        positionX: number;
        positionY: number;
    }[];

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @ManyToOne(() => Event, (event) => event.templates, {
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'eventId' })
    event: Event;

    @OneToMany(() => QrCode, (qrCode) => qrCode.template, {
        lazy: true,
    })
    qrCodes: QrCode[];

    qrCount?: number;
}
