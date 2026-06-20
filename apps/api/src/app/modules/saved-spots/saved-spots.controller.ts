import { Body, Controller, Delete, Get, HttpCode, NotFoundException, Param, Post, Query, Req, UseInterceptors } from '@nestjs/common';
import { Request } from 'express';
import { baseUrlFromRequest } from '../../common/image-url';
import { RequireAuth } from '../auth/require-auth.decorator';
import { RequestContextService } from '../auth/request-context.service';
import { TripResolutionInterceptor } from '../auth/trip-resolution.interceptor';
import { SavedSpotsService } from './saved-spots.service';

@RequireAuth()
@Controller('saved-spots')
@UseInterceptors(TripResolutionInterceptor)
export class SavedSpotsController {
  constructor(
    private readonly savedSpotsService: SavedSpotsService,
    private readonly requestContext: RequestContextService,
  ) {}

  private requireTripId(): string {
    const tripId = this.requestContext.getTripId();
    if (!tripId) throw new NotFoundException({ code: 'trip_not_found', message: 'No active trip found.' });
    return tripId;
  }

  @Get()
  getSavedSpots(
    @Req() req: Request,
    @Query('tripId') tripId?: string,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ) {
    return this.savedSpotsService.getSavedSpots(this.requireTripId(), { tripId, limit, cursor }, baseUrlFromRequest(req));
  }

  @Post()
  @HttpCode(200)
  saveSpot(
    @Req() req: Request,
    @Body() body: { spotId: string; tripId?: string },
  ) {
    return this.savedSpotsService.saveSpot(this.requireTripId(), body, baseUrlFromRequest(req));
  }

  @Delete(':spotId')
  unsaveSpot(
    @Param('spotId') spotId: string,
    @Query('tripId') tripId?: string,
  ) {
    return this.savedSpotsService.unsaveSpot(this.requireTripId(), spotId, { tripId });
  }
}
