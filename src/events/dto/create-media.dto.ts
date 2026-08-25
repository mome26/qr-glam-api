import { IsString, IsOptional, IsEnum, IsInt } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateMediaDto {
    @ApiProperty({
        description: 'Event ID this media belongs to',
        example: 1,
    })
    @IsOptional()
    @IsInt()
    eventId: number;

    @ApiProperty({
        description: 'Media title',
        example: 'Bride & Groom Portrait',
    })
    @IsString()
    title: string;

    @ApiProperty({
        description: 'Media file URL',
        example: 'https://api.example.com/media/123/bride-groom.jpg',
    })
    @IsString()
    fileUrl: string;

    @ApiPropertyOptional({
        description: 'Media type',
        example: 'photo',
        enum: ['photo', 'video', 'document'],
    })
    @IsOptional()
    @IsEnum(['photo', 'video', 'document'])
    mediaType?: string;

    @ApiPropertyOptional({
        description: 'File size in bytes',
        example: 3355443,
    })
    @IsOptional()
    @IsInt()
    fileSize?: number;

    @ApiPropertyOptional({
        description: 'File format/MIME type',
        example: 'image/jpeg',
    })
    @IsOptional()
    @IsString()
    mimeType?: string;

    @ApiPropertyOptional({
        description: 'Event phase/section',
        example: 'ceremony',
    })
    @IsOptional()
    @IsString()
    phase?: string;

    @ApiPropertyOptional({
        description: 'Guest ID who uploaded this media',
        example: 1,
    })
    @IsOptional()
    @IsInt()
    uploadedBy?: number;

    @ApiPropertyOptional({
        description:
            'Google Drive file ID for Drive-sourced media (for thumbnail construction)',
        example: 'abc123xyz456',
    })
    @IsOptional()
    @IsString()
    driveFileId?: string;

    @ApiPropertyOptional({
        description: 'Media approval status',
        example: 'approved',
        enum: ['pending', 'approved', 'rejected'],
    })
    @IsOptional()
    @IsEnum(['pending', 'approved', 'rejected'])
    status?: string;
}
