import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    DeleteDateColumn,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Event } from './event.entity';

@Entity('event_media')
export class Media {
    @ApiProperty({
        description: 'Unique identifier (integer)',
        example: 1,
    })
    @PrimaryGeneratedColumn()
    id: number;

    @ApiProperty({
        description: 'Event ID this media belongs to',
        example: 1,
    })
    @Column({ type: 'integer' })
    eventId: number;

    @ApiProperty({
        description: 'Media title',
        example: 'Bride & Groom Portrait',
    })
    @Column({ type: 'text' })
    title: string;

    @ApiProperty({
        description: 'Media file URL',
        example: 'https://api.example.com/media/123/bride-groom.jpg',
    })
    @Column({ type: 'text' })
    fileUrl: string;

    @ApiProperty({
        description: 'Media type',
        example: 'photo',
        enum: ['photo', 'video', 'document'],
    })
    @Column({ type: 'text', default: 'photo' })
    mediaType: string;

    @ApiProperty({
        description: 'File size in bytes',
        example: 3355443,
        nullable: true,
    })
    @Column({ type: 'integer', nullable: true })
    fileSize?: number;

    @ApiProperty({
        description: 'File format/MIME type',
        example: 'image/jpeg',
        nullable: true,
    })
    @Column({ type: 'text', nullable: true })
    mimeType?: string;

    @ApiProperty({
        description: 'Event phase/section',
        example: 'ceremony',
        nullable: true,
    })
    @Column({ type: 'text', nullable: true })
    phase?: string;

    @ApiProperty({
        description: 'Guest ID who uploaded this media',
        example: 1,
        nullable: true,
    })
    @Column({ type: 'integer', nullable: true })
    uploadedBy?: number;

    @ApiProperty({
        description:
            'Google Drive file ID for Drive-sourced media (for thumbnail construction)',
        example: 'abc123xyz456',
        nullable: true,
    })
    @Column({ type: 'text', nullable: true })
    driveFileId?: string;

    @ApiProperty({
        description: 'Media approval status',
        example: 'approved',
        enum: ['pending', 'approved', 'rejected'],
    })
    @Column({ type: 'text', default: 'approved' })
    status: string;

    @ApiProperty({
        description: 'Whether watermark is applied',
        example: true,
    })
    @Column({ type: 'boolean', default: false })
    hasWatermark: boolean;

    @ApiProperty({
        description: 'Media download count',
        example: 45,
    })
    @Column({ type: 'integer', default: 0 })
    downloadCount: number;

    @ApiProperty({
        description: 'Creation timestamp',
        example: '2024-01-01T12:00:00.000Z',
    })
    @CreateDateColumn()
    createdAt: Date;

    @ApiProperty({
        description: 'Last update timestamp',
        example: '2024-01-01T12:00:00.000Z',
    })
    @UpdateDateColumn()
    updatedAt: Date;

    @ApiProperty({
        description: 'Deletion timestamp',
        example: '2024-01-01T12:00:00.000Z',
        nullable: true,
    })
    @DeleteDateColumn()
    deletedAt: Date;

    @ManyToOne(() => Event, (event) => event.media)
    @JoinColumn({ name: 'eventId' })
    event: Event;
}
