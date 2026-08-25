import { IsEnum } from 'class-validator';

export class UpdateUserRoleDto {
    @IsEnum(['ADMIN', 'STAFF', 'MEMBER'])
    role: string;
}
