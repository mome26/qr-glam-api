import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    DeleteDateColumn,
    ManyToOne,
    JoinColumn,
    OneToOne,
    Index,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { QrTemplate } from './qr-template.entity';
import { Event } from '../../events/entities/event.entity';
import { Guest } from '../../guests/entities/guest.entity';
import { generateQrLink } from '../utils/qr-link.util';

@Entity('qr_codes')
@Index(['eventId', 'numericId'], { unique: true })
export class QrCode {
    @ApiProperty({
        description: 'Database ID (integer)',
        example: 1,
    })
    @PrimaryGeneratedColumn()
    id: number;

    @ApiProperty({
        description: 'Guest ID this QR is uniquely assigned to',
        example: 1,
    })
    @Column('integer', { unique: true })
    guestId: number;

    @ApiProperty({
        description: 'ID of the event this QR code belongs to',
        example: 1,
    })
    @Column('integer')
    eventId: number;

    @ApiProperty({
        description: 'Sequential ID per event',
        example: 1,
    })
    @Column('int')
    numericId: number;

    @ApiPropertyOptional({
        description: 'Optional override redirect target',
        example: 'https://custom.com',
    })
    @Column('text', { nullable: true })
    redirectLink: string;

    @ApiPropertyOptional({
        description:
            'Guest-specific media URL override (validated HTTP/HTTPS URL)',
        example: 'https://drive.google.com/file/d/abc123/view',
    })
    @Column('text', { nullable: true })
    customMediaUrl: string;

    @ApiPropertyOptional({
        description: 'Template ID for the QR code',
        example: 1,
    })
    @Column('integer', { nullable: true })
    templateId: number;

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

    @OneToOne(() => Guest, (guest) => guest.qrCode, {
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'guestId' })
    guest: Guest;

    @ManyToOne(() => Event, { onDelete: 'CASCADE', lazy: true })
    @JoinColumn({ name: 'eventId' })
    event: Event;

    @ManyToOne(() => QrTemplate, (template) => template.qrCodes, {
        nullable: true,
        onDelete: 'SET NULL',
    })
    @JoinColumn({ name: 'templateId' })
    template: QrTemplate;

    /** Computed QR scan URL — not a DB column, populated after relations loaded */
    @ApiProperty({
        description: 'Public-facing QR scan URL (computed on-the-fly)',
        example: 'http://localhost:5173/e/abc123/qr/1',
    })
    qrLink: string;

    /**
     * Compute qrLink after entity and relations are fully loaded.
     * Must be called explicitly after fetching QR codes — @AfterLoad()
     * runs before relations are populated, so we can't use it here.
     */
    computeQrLink(): void {
        // Use urlHash if event relation is loaded, otherwise fall back to numeric ID
        if (this.event?.urlHash) {
            this.qrLink = generateQrLink(this.event, this.numericId);
        } else {
            this.qrLink = generateQrLink(this.eventId, this.numericId);
        }
    }
}
