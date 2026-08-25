import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    DeleteDateColumn,
    ManyToOne,
    JoinColumn,
    Index,
    OneToOne,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Event } from '../../events/entities/event.entity';
import { QrCode } from '../../qr-codes/entities/qr-code.entity';

@Entity('guests')
@Index(['eventId', 'name'])
export class Guest {
    @ApiProperty({
        description: 'Unique identifier (integer)',
        example: 1,
    })
    @PrimaryGeneratedColumn()
    id: number;

    @ApiProperty({
        description: 'Event ID this guest belongs to',
        example: 1,
    })
    @Column('integer')
    eventId: number;

    @ApiProperty({
        description: 'Guest full name',
        example: 'Emily Johnson',
    })
    @Column('varchar', { length: 255 })
    name: string;

    @ApiProperty({
        description: 'Guest email address',
        example: 'emily.johnson@example.com',
        nullable: true,
    })
    @Column('varchar', { length: 255, nullable: true })
    email?: string;

    @ApiProperty({
        description: 'Guest phone number',
        example: '+1-555-0123',
        nullable: true,
    })
    @Column('varchar', { nullable: true })
    phone?: string;

    @ApiProperty({
        description: 'Guest role or title',
        example: 'Bride',
        nullable: true,
    })
    @Column('varchar', { nullable: true })
    role?: string;

    @ApiProperty({
        description: 'Guest group/category',
        example: 'Bridal Party',
        nullable: true,
    })
    @Column('varchar', { nullable: true })
    group?: string;

    @ApiProperty({
        description: 'Base64 encoded guest photo',
        example: 'data:image/jpeg;base64,/9j/4AAQSkZJRg...',
        nullable: true,
    })
    @Column('text', { nullable: true })
    photoData?: string;

    @ApiProperty({
        description: 'Guest avatar/photo URL',
        example: 'https://api.example.com/guests/123/avatar.jpg',
        nullable: true,
    })
    @Column('text', { nullable: true })
    avatarUrl?: string;

    @ApiProperty({
        description: 'Custom media URL for guest',
        example: 'https://r2.example.com/events/1/custom-media-123.jpg',
        nullable: true,
    })
    @Column('text', { nullable: true })
    customMediaUrl?: string;

    @ApiProperty({
        description: 'Number of media items uploaded by this guest',
        example: 24,
    })
    @Column('integer', { default: 0 })
    mediaCount: number;

    @ApiProperty({
        description: 'Guest lifecycle status',
        example: 'Pending',
        enum: ['Pending', 'Complete', 'Denied'],
    })
    @Column('varchar', {
        default: 'Pending',
        nullable: false,
    })
    status: 'Pending' | 'Complete' | 'Denied';

    @ApiPropertyOptional({
        description:
            'Timestamp of the first QR code scan. Null means never scanned. Immutable after first set.',
        example: '2024-01-15T18:30:00.000Z',
        nullable: true,
    })
    @Column('datetime', { nullable: true })
    scannedAt?: Date;

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
    @ApiPropertyOptional({
        description: 'Soft-delete timestamp (null if active)',
        example: '2026-03-29T12:00:00.000Z',
        nullable: true,
    })
    @DeleteDateColumn({ nullable: true })
    deletedAt?: Date;

    @OneToOne(() => QrCode, (qrCode) => qrCode.guest, {
        eager: true,
        cascade: true,
    })
    qrCode: QrCode;

    @ManyToOne(() => Event, (event) => event.guests, {
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'eventId' })
    event: Event;
}
