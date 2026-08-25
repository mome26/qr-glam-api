import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class QrCodeResponseDto {
    @ApiProperty()
    id: number;

    @ApiProperty()
    guestId: number;

    @ApiProperty()
    eventId: number;

    @ApiProperty()
    numericId: number;

    @ApiProperty()
    qrLink: string;

    @ApiPropertyOptional()
    redirectLink?: string;

    @ApiPropertyOptional()
    templateId?: number;

    @ApiProperty()
    createdAt: Date;

    @ApiProperty()
    updatedAt: Date;
}
