import {
    Injectable,
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    Logger,
} from '@nestjs/common';

@Injectable()
export class AdminStaffGuard implements CanActivate {
    private readonly logger = new Logger(AdminStaffGuard.name);

    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest();
        const user = request.user;

        this.logger.debug(
            `AdminStaffGuard check - user: ${JSON.stringify(user)}`,
        );

        if (!user || (user.role !== 'ADMIN' && user.role !== 'STAFF')) {
            this.logger.warn(
                `Access denied - user role: ${user?.role}, expected: ADMIN or STAFF`,
            );
            throw new ForbiddenException(
                'Only admins and staff can access this resource',
            );
        }

        return true;
    }
}
