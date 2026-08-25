import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    DeleteDateColumn,
    OneToMany,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Guest } from '../../guests/entities/guest.entity';
import { Media } from './media.entity';
import { Activity } from './activity.entity';
import { User } from '../../users/entities/user.entity';
import { QrTemplate } from '../../qr-codes/entities/qr-template.entity';
import { QrCode } from '../../qr-codes/entities/qr-code.entity';
import { EventStatus } from '../enums/event-status.enum';
import { UrlStrategy } from '../enums/url-strategy.enum';

@Entity('events')
export class Event {
    @ApiProperty({
        description: 'Unique identifier (integer)',
        example: 1,
    })
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ nullable: true })
    ownerId: number;

    @ManyToOne(() => User)
    owner: User;

    @ApiProperty({
        description: 'Event name/title',
        example: 'Annual Gala 2024',
    })
    @Column('varchar', { length: 255 })
    name: string;

    @ApiProperty({
        description: 'Event description',
        example: 'A grand celebration event',
        nullable: true,
    })
    @Column('text', { nullable: true })
    description: string;

    @ApiProperty({
        description: 'Event date and time',
        example: '2024-12-31T18:00:00.000Z',
    })
    @Column('datetime')
    date: Date;

    @ApiProperty({
        description: 'Event location/venue',
        example: 'Grand Ballroom, Downtown Hotel',
        nullable: true,
    })
    @Column('text', { nullable: true })
    location: string;

    @ApiProperty({
        description: 'Default template ID for new QR codes',
        example: 1,
        nullable: true,
    })
    @Column('integer', { nullable: true })
    defaultTemplateId: number;

    @ApiProperty({
        description:
            'Extracted Google Drive folder ID for backend media resolution',
        example: '1AXmDus_1etoItdou_gJZx6LXUnwxoeiS',
        nullable: true,
    })
    @Column('text', { nullable: true, name: 'mediaFolderUrl' })
    mediaFolderId: string;

    @ApiProperty({
        description:
            'Full media source URL (e.g. Google Drive folder link) for organizer input',
        example:
            'https://drive.google.com/drive/folders/1AXmDus_1etoItdou_gJZx6LXUnwxoeiS',
        nullable: true,
    })
    @Column('text', { nullable: true, name: 'mediaLink' })
    mediaSourceUrl: string;

    @ApiProperty({
        description: 'Event image/banner URL',
        example: 'https://api.example.com/events/123/banner.jpg',
        nullable: true,
    })
    @Column('text', { nullable: true })
    imageUrl: string;

    @ApiProperty({
        description: 'Maximum number of attendees',
        example: 500,
        nullable: true,
    })
    @Column('integer', { nullable: true })
    maxAttendees: number;

    @ApiProperty({
        description: 'Current number of registered attendees',
        example: 325,
    })
    @Column('integer', { default: 0 })
    registeredAttendees: number;

    @ApiProperty({
        description: 'Event status',
        example: 'upcoming',
        enum: EventStatus,
    })
    @Column({
        type: 'text',
        default: EventStatus.DRAFT,
    })
    status: EventStatus;

    @ApiProperty({
        description: 'Event visibility (public/private)',
        example: 'private',
        default: 'private',
    })
    @Column({ type: 'text', default: 'private' })
    visibility: string;

    @ApiProperty({
        description: 'URL-safe identifier for the event',
        example: 'my-awesome-event',
        nullable: true,
    })
    @Column({ nullable: true, unique: true })
    slug: string;

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

    @ApiProperty({
        description: 'URL format strategy for event and QR code links',
        enum: UrlStrategy,
        example: UrlStrategy.PURE_SLUG,
    })
    @Column({
        type: 'text',
        default: UrlStrategy.PURE_SLUG,
    })
    urlStrategy: UrlStrategy;

    @ApiPropertyOptional({
        description: 'UUID v7 identifier for private URL access (immutable)',
        example: '018efa3b-1234-7abc-9def-0123456789ab',
    })
    @Column({ type: 'varchar', length: 36, nullable: true, unique: true })
    urlHash: string;

    @ApiProperty({
        description:
            'Whether JWT authentication is required for scanning the QR code',
        default: false,
    })
    @Column({ type: 'boolean', default: false })
    requireAuthForQrScan: boolean;

    @ApiPropertyOptional({
        description:
            'Custom Handlebars HTML template for the QR scan page. NULL means default template.',
        nullable: true,
    })
    @Column('text', { nullable: true })
    scanPageTemplate: string;

    @ApiPropertyOptional({
        description:
            'ID of a built-in .hbs scan page template. Set when a named template is selected without modification. Mutually exclusive with scanPageTemplate.',
        nullable: true,
        example: 'wedding-vi',
    })
    @Column('varchar', { length: 100, nullable: true })
    scanPageTemplateId: string;

    @OneToMany(() => Guest, (guest) => guest.event, {
        lazy: true,
    })
    guests: Guest[];

    @OneToMany(() => QrTemplate, (template) => template.event, {
        lazy: true,
    })
    templates: QrTemplate[];

    @OneToMany(() => QrCode, (qrCode) => qrCode.event, {
        lazy: true,
    })
    qrCodes: QrCode[];

    @OneToMany(() => Media, (media) => media.event, {
        cascade: ['soft-remove'],
    })
    media: Media[];

    @OneToMany(() => Activity, (activity) => activity.event, {
        cascade: ['soft-remove'],
    })
    activities: Activity[];

    @ManyToOne(() => QrTemplate, { nullable: true, lazy: true })
    @JoinColumn({ name: 'defaultTemplateId' })
    defaultTemplate: QrTemplate;
}
