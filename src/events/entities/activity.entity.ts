import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    DeleteDateColumn,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Event } from './event.entity';

@Entity('event_activities')
export class Activity {
    @ApiProperty({
        description: 'Unique identifier (integer)',
        example: 1,
    })
    @PrimaryGeneratedColumn()
    id: number;

    @ApiProperty({
        description: 'Event ID this activity belongs to',
        example: 1,
    })
    @Column({ type: 'integer' })
    eventId: number;

    @ApiProperty({
        description: 'Activity type',
        example: 'photo_upload',
        enum: [
            'photo_upload',
            'qr_code_generated',
            'guest_added',
            'guest_removed',
            'event_updated',
            'media_approved',
        ],
    })
    @Column({ type: 'text' })
    type: string;

    @ApiProperty({
        description: 'Activity title',
        example: 'Photo Upload',
    })
    @Column({ type: 'text' })
    title: string;

    @ApiProperty({
        description: 'Activity description',
        example: 'Added 12 new photos by David Kim',
    })
    @Column({ type: 'text' })
    description: string;

    @ApiProperty({
        description: 'Icon/emoji for the activity',
        example: 'camera',
        nullable: true,
    })
    @Column({ type: 'text', nullable: true })
    icon?: string;

    @ApiProperty({
        description: 'User who performed the action',
        example: 'David Kim',
        nullable: true,
    })
    @Column({ type: 'text', nullable: true })
    performedBy?: string;

    @ApiProperty({
        description: 'Related entity ID',
        example: 1,
        nullable: true,
    })
    @Column({ type: 'integer', nullable: true })
    relatedEntityId?: number;

    @ApiProperty({
        description: 'Additional metadata as JSON',
        example: { count: 12 },
        nullable: true,
    })
    @Column({ type: 'simple-json', nullable: true })
    metadata?: any;

    @ApiProperty({
        description: 'Creation timestamp',
        example: '2024-01-01T12:00:00.000Z',
    })
    @CreateDateColumn()
    createdAt: Date;

    @ApiProperty({
        description: 'Deletion timestamp',
        example: '2024-01-01T12:00:00.000Z',
        nullable: true,
    })
    @DeleteDateColumn()
    deletedAt: Date;

    @ManyToOne(() => Event, (event) => event.activities, {
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'eventId' })
    event: Event;
}
