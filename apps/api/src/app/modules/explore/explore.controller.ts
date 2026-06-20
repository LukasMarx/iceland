import { Body, Controller, Get, HttpCode, NotFoundException, Param, Post, Query, Req, UseInterceptors } from '@nestjs/common';
import { Request } from 'express';
import { baseUrlFromRequest } from '../../common/image-url';
import { RequireAuth } from '../auth/require-auth.decorator';
import { RequestContextService } from '../auth/request-context.service';
import { TripResolutionInterceptor } from '../auth/trip-resolution.interceptor';
import { ExploreService } from './explore.service';

@RequireAuth()
@Controller()
@UseInterceptors(TripResolutionInterceptor)
export class ExploreController {
  constructor(
    private readonly exploreService: ExploreService,
    private readonly requestContext: RequestContextService,
  ) {}

  @Get('explore')
  getExplore(
    @Req() req: Request,
    @Query('status') status?: string,
    @Query('category') category?: string,
    @Query('vehicle') vehicle?: string,
    @Query('showFRoads') showFRoads?: string,
    @Query('maxDriveMinutes') maxDriveMinutes?: string,
    @Query('tripId') tripId?: string,
    @Query('date') date?: string,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ) {
    const resolvedTripId = this.requestContext.getTripId();
    return this.exploreService.getExplore(resolvedTripId, { status, category, vehicle, showFRoads, maxDriveMinutes, tripId, date, limit, cursor }, baseUrlFromRequest(req));
  }

  @Get('spots/:spotId/context')
  getSpotContext(
    @Req() req: Request,
    @Param('spotId') spotId: string,
    @Query('tripId') tripId?: string,
    @Query('date') date?: string,
  ) {
    const resolvedTripId = this.requestContext.getTripId();
    if (!resolvedTripId) throw new NotFoundException({ code: 'trip_not_found', message: 'No active trip found.' });
    return this.exploreService.getSpotContext(resolvedTripId, spotId, { tripId, date }, baseUrlFromRequest(req));
  }

  @Post('spots/:spotId/status-refresh')
  @HttpCode(200)
  refreshSpotStatus(
    @Req() req: Request,
    @Param('spotId') spotId: string,
    @Body() body: { tripId?: string; date?: string; force?: boolean },
  ) {
    const resolvedTripId = this.requestContext.getTripId();
    if (!resolvedTripId) throw new NotFoundException({ code: 'trip_not_found', message: 'No active trip found.' });
    return this.exploreService.refreshSpotStatus(resolvedTripId, spotId, body ?? {}, baseUrlFromRequest(req));
  }
}
