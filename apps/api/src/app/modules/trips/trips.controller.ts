import { Body, Controller, Get, HttpCode, NotFoundException, Post, Query, UnauthorizedException, UseInterceptors } from '@nestjs/common';
import { RequireAuth } from '../auth/require-auth.decorator';
import { RequestContextService } from '../auth/request-context.service';
import { TripResolutionInterceptor } from '../auth/trip-resolution.interceptor';
import { TripsService } from './trips.service';

@RequireAuth()
@Controller()
@UseInterceptors(TripResolutionInterceptor)
export class TripsController {
  constructor(
    private readonly tripsService: TripsService,
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

  @Get('trip')
  getTrip(@Query('tripId') tripId?: string) {
    return this.tripsService.getTrip(this.requireUserId(), this.requireTripId(), { tripId });
  }

  @Post('draft-days')
  @HttpCode(200)
  addDraftDay(
    @Body()
    body: {
      spotId?: string;
      routeId?: string;
      tripId?: string;
      title?: string;
      date?: string;
      idempotencyKey?: string;
    },
  ) {
    return this.tripsService.addDraftDay(this.requireUserId(), this.requireTripId(), body);
  }
}
