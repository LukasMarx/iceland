import { Body, Controller, Get, HttpCode, Param, Post, Query, Req } from '@nestjs/common';
import { Request } from 'express';
import { baseUrlFromRequest } from '../../common/image-url';
import { RequireAuth } from '../auth/require-auth.decorator';
import { ExploreService } from './explore.service';

@RequireAuth()
@Controller()
export class ExploreController {
  constructor(private readonly exploreService: ExploreService) {}

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
    return this.exploreService.getExplore({ status, category, vehicle, showFRoads, maxDriveMinutes, tripId, date, limit, cursor }, baseUrlFromRequest(req));
  }

  @Get('spots/:spotId/context')
  getSpotContext(
    @Req() req: Request,
    @Param('spotId') spotId: string,
    @Query('tripId') tripId?: string,
    @Query('date') date?: string,
  ) {
    return this.exploreService.getSpotContext(spotId, { tripId, date }, baseUrlFromRequest(req));
  }

  @Post('spots/:spotId/status-refresh')
  @HttpCode(200)
  refreshSpotStatus(
    @Req() req: Request,
    @Param('spotId') spotId: string,
    @Body() body: { tripId?: string; date?: string; force?: boolean },
  ) {
    return this.exploreService.refreshSpotStatus(spotId, body ?? {}, baseUrlFromRequest(req));
  }
}
