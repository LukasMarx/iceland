import { Body, Controller, Get, HttpCode, Param, Post, Query } from '@nestjs/common';
import { ExploreService } from './explore.service';

@Controller()
export class ExploreController {
  constructor(private readonly exploreService: ExploreService) {}

  @Get('explore')
  getExplore(
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
    return this.exploreService.getExplore({ status, category, vehicle, showFRoads, maxDriveMinutes, tripId, date, limit, cursor });
  }

  @Get('spots/:spotId/context')
  getSpotContext(
    @Param('spotId') spotId: string,
    @Query('tripId') tripId?: string,
    @Query('date') date?: string,
  ) {
    return this.exploreService.getSpotContext(spotId, { tripId, date });
  }

  @Post('spots/:spotId/status-refresh')
  @HttpCode(200)
  refreshSpotStatus(
    @Param('spotId') spotId: string,
    @Body() body: { tripId?: string; date?: string; force?: boolean },
  ) {
    return this.exploreService.refreshSpotStatus(spotId, body ?? {});
  }
}
