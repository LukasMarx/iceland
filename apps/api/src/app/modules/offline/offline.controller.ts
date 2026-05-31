import { Body, Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import { RequireAuth } from '../auth/require-auth.decorator';
import { OfflineService } from './offline.service';

@RequireAuth()
@Controller('offline')
export class OfflineController {
  constructor(private readonly offlineService: OfflineService) {}

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
    return this.offlineService.cacheRegions(body);
  }

  @Get('cache-jobs/:cacheJobId')
  getCacheJob(@Param('cacheJobId') cacheJobId: string) {
    return this.offlineService.getCacheJob(cacheJobId);
  }
}
