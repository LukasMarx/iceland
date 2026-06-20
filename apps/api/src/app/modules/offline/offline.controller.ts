import { Body, Controller, Get, HttpCode, NotFoundException, Param, Post, UnauthorizedException, UseInterceptors } from '@nestjs/common';
import { RequireAuth } from '../auth/require-auth.decorator';
import { RequestContextService } from '../auth/request-context.service';
import { TripResolutionInterceptor } from '../auth/trip-resolution.interceptor';
import { OfflineService } from './offline.service';

@RequireAuth()
@Controller('offline')
@UseInterceptors(TripResolutionInterceptor)
export class OfflineController {
  constructor(
    private readonly offlineService: OfflineService,
    private readonly requestContext: RequestContextService,
  ) {}

  private requireUserId(): string {
    const userId = this.requestContext.getUserId();
    if (!userId) throw new UnauthorizedException('Authentication required');
    return userId;
  }

  private requireTripId(): string {
    const tripId = this.requestContext.getTripId();
    if (!tripId) throw new NotFoundException({ code: 'trip_not_found', message: 'No active trip found.' });
    return tripId;
  }

  @Post('cache-regions')
  @HttpCode(202)
  cacheRegions(
    @Body()
    body: {
      tripId?: string;
      mode: string;
      label?: string;
      regions?: { lat: number; lon: number; radiusKm: number }[];
      includeRouteIds?: string[];
      includeSpotIds?: string[];
    },
  ) {
    return this.offlineService.cacheRegions(this.requireUserId(), this.requireTripId(), body);
  }

  @Get('cache-jobs/:cacheJobId')
  getCacheJob(@Param('cacheJobId') cacheJobId: string) {
    return this.offlineService.getCacheJob(cacheJobId);
  }
}
