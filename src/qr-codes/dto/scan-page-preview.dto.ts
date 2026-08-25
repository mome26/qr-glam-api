import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ScanPagePreviewDto {
    @ApiProperty({
        description: 'HTML template to preview',
        example: '<html><body>{{eventName}}</body></html>',
    })
    @IsString()
    @IsNotEmpty({ message: 'template is required' })
    template: string;
}
