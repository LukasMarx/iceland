import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, from, switchMap } from 'rxjs';
import { PrismaService } from '../../prisma.service';
import { RequestContextService } from './request-context.service';

/**
 * Resolves the active trip for the authenticated user and stores it
 * in the RequestContextService. Runs after guards (including AuthGuard)
 * so the user is already authenticated.
 *
 * This replaces the trip-loading logic that was previously in AuthGuard.
 * Only routes that include this interceptor will incur the trip query.
 */
@Injectable()
export class TripResolutionInterceptor implements NestInterceptor {
  constructor(
    private readonly requestContext: RequestContextService,
    private readonly prisma: PrismaService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const userId = this.requestContext.getUserId();

    if (!userId) {
      return next.handle();
    }

    return from(
      this.prisma.trip.findFirst({
        where: { ownerId: userId, archivedAt: null },
        orderBy: { createdAt: 'desc' },
        select: { id: true, activeHubId: true },
      }),
    ).pipe(
      switchMap((activeTrip) => {
        if (activeTrip) {
          this.requestContext.setAuthState({
            user: this.requestContext.getUser()!,
            activeTripId: activeTrip.id,
            activeHubId: activeTrip.activeHubId,
          });
        }
        return next.handle();
      }),
    );
  }
}
