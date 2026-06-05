import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { REQUIRE_ADMIN_KEY } from './require-admin.decorator';
import { RequestContextService } from './request-context.service';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly requestContext: RequestContextService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const requiresAdmin =
      this.reflector.getAllAndOverride<boolean>(REQUIRE_ADMIN_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? false;

    if (!requiresAdmin) {
      return true;
    }

    const user = this.requestContext.getUser();

    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }

    if (user.role !== 'admin') {
      throw new ForbiddenException('Admin access required');
    }

    return true;
  }
}