import {
    IsString,
    IsOptional,
    IsInt,
    Min,
    Max,
    Length,
    IsBoolean,
    IsIn,
    IsArray,
    ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CustomTextDto } from './custom-text.dto';

export class CreateQrTemplateDto {
    @IsString()
    @Length(1, 100)
    name: string;

    @IsOptional()
    @IsString()
    backgroundImage?: string;

    @IsInt()
    @Min(0)
    @Max(2000)
    qrPositionX: number;

    @IsInt()
    @Min(0)
    @Max(2000)
    qrPositionY: number;

    @IsInt()
    @Min(1)
    @Max(500)
    qrSize: number;

    @IsOptional()
    @IsBoolean()
    showNumericIdBelow?: boolean;

    @IsOptional()
    @IsInt()
    @Min(8)
    @Max(200)
    numericIdSize?: number;

    @IsOptional()
    @IsString()
    @IsIn(['black', 'white'])
    textColor?: string;

    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CustomTextDto)
    customTexts?: CustomTextDto[];
}
