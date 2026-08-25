import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    UseGuards,
    Request,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/strategies/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { InviteUserDto } from './dto/invite-user.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
    ApiBadRequestResponse,
    ApiForbiddenResponse,
    ApiConflictResponse,
} from '@nestjs/swagger';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
    constructor(private readonly usersService: UsersService) {}

    @Get()
    @UseGuards(AdminGuard)
    @ApiOperation({ summary: 'Get all users - Admin only' })
    @ApiResponse({ status: 200, description: 'List of all users' })
    @ApiForbiddenResponse({ description: 'Forbidden - admin only' })
    findAll() {
        return this.usersService.findAll();
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update user profile' })
    @ApiResponse({ status: 200, description: 'User profile updated' })
    @ApiForbiddenResponse({ description: 'Forbidden - updating other user' })
    @ApiConflictResponse({ description: 'Email already in use' })
    update(
        @Param('id') id: string,
        @Body() dto: UpdateUserDto,
        @Request() req,
    ) {
        return this.usersService.update(+id, dto, req.user.email);
    }

    @Patch(':id/password')
    @ApiOperation({ summary: 'Change user password' })
    @ApiResponse({ status: 200, description: 'Password changed successfully' })
    @ApiBadRequestResponse({ description: 'Incorrect current password' })
    @ApiForbiddenResponse({
        description: 'Forbidden - changing other user password',
    })
    changePassword(
        @Param('id') id: string,
        @Body() dto: ChangePasswordDto,
        @Request() req,
    ) {
        return this.usersService.changePassword(+id, dto, req.user.email);
    }

    @Post('invite')
    @UseGuards(AdminGuard)
    @ApiOperation({ summary: 'Invite a new team member - Admin only' })
    @ApiResponse({ status: 201, description: 'User invited' })
    @ApiForbiddenResponse({ description: 'Forbidden - only admin can invite' })
    @ApiConflictResponse({ description: 'Email already exists' })
    invite(@Body() dto: InviteUserDto, @Request() req) {
        return this.usersService.invite(dto, req.user.email);
    }

    @Patch(':id/role')
    @UseGuards(AdminGuard)
    @ApiOperation({ summary: 'Update user role - Admin only' })
    @ApiResponse({ status: 200, description: 'Role updated successfully' })
    @ApiForbiddenResponse({ description: 'Forbidden - admin only' })
    updateRole(
        @Param('id') id: string,
        @Body() dto: UpdateUserRoleDto,
        @Request() req,
    ) {
        return this.usersService.updateRole(+id, dto, req.user.email);
    }

    @Delete(':id')
    @UseGuards(AdminGuard)
    @ApiOperation({ summary: 'Remove a team member - Admin only' })
    @ApiResponse({ status: 200, description: 'User removed' })
    @ApiBadRequestResponse({ description: 'Cannot delete self or last admin' })
    @ApiForbiddenResponse({ description: 'Forbidden - admin only' })
    remove(@Param('id') id: string, @Request() req) {
        return this.usersService.remove(+id, req.user.email);
    }
}
