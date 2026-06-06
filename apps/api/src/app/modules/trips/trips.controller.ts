import { Body, Controller, Get, HttpCode, Post, Query } from '@nestjs/common';
import { RequireAuth } from '../auth/require-auth.decorator';
import { TripsService } from './trips.service';

@RequireAuth()
@Controller()
export class TripsController {
  constructor(private readonly tripsService: TripsService) {}

  @Get('trip')
  getTrip(@Query('tripId') tripId?: string) {
    return this.tripsService.getTrip({ tripId });
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
    return this.tripsService.addDraftDay(body);
  }
}
