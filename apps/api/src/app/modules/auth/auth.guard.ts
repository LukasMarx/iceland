import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma.service';
import { AuthTokensService } from './auth-tokens.service';
import { REQUIRE_AUTH_KEY } from './require-auth.decorator';
import { RequestContextService } from './request-context.service';

@Injectable()
export class AppAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authTokens: AuthTokensService,
    private readonly requestContext: RequestContextService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiresAuth =
      this.reflector.getAllAndOverride<boolean>(REQUIRE_AUTH_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? false;

    const request = context.switchToHttp().getRequest<{
      headers?: { authorization?: string | string[] };
    }>();
    const authorizationHeader = request.headers?.authorization;
    const token = this.extractBearerToken(authorizationHeader);

    if (!token) {
      this.requestContext.clearAuthState();
      if (requiresAuth) {
        throw new UnauthorizedException('Authentication required');
      }
      return true;
    }

    const user = await this.authTokens.verifyAccessToken(token);
    const activeTrip = await this.prisma.trip.findFirst({
      where: { ownerId: user.userId, archivedAt: null },
      orderBy: { createdAt: 'desc' },
      select: { id: true, activeHubId: true },
    });

    this.requestContext.setAuthState({
      user,
      activeTripId: activeTrip?.id,
      activeHubId: activeTrip?.activeHubId,
    });

    return true;
  }

  private extractBearerToken(authorizationHeader?: string | string[]): string | undefined {
    const rawValue = Array.isArray(authorizationHeader)
      ? authorizationHeader[0]
      : authorizationHeader;

    if (!rawValue) {
      return undefined;
    }

    const [scheme, token] = rawValue.split(' ');
    if (scheme?.toLowerCase() !== 'bearer' || !token) {
      throw new UnauthorizedException('Bearer token required');
    }

    return token;
  }
}