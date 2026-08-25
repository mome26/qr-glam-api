import { IsString, IsInt, Min, Max, Length, Matches } from 'class-validator';

export class CustomTextDto {
    @IsString()
    @Matches(/^[0-9a-f\-]{36}$/, {
        message: 'id must be a valid UUID v4 (36 characters)',
    })
    id: string; // client-side UUID for list management

    @IsString()
    @Length(1, 200)
    content: string;

    @IsInt()
    @Min(1)
    @Max(500)
    size: number;

    @IsInt()
    @Min(0)
    @Max(2000)
    positionX: number;

    @IsInt()
    @Min(0)
    @Max(2000)
    positionY: number;
}
