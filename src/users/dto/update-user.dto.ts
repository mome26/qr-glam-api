import {
    IsString,
    IsEmail,
    MinLength,
    MaxLength,
    IsOptional,
} from 'class-validator';

export class UpdateUserDto {
    @IsOptional()
    @IsString()
    @MinLength(2)
    @MaxLength(100)
    name?: string;

    @IsOptional()
    @IsEmail()
    email?: string;
}
