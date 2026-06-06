import { Body, Controller, Delete, Get, HttpCode, Param, Post, Query, Req } from '@nestjs/common';
import { Request } from 'express';
import { baseUrlFromRequest } from '../../common/image-url';
import { RequireAuth } from '../auth/require-auth.decorator';
import { SavedSpotsService } from './saved-spots.service';

@RequireAuth()
@Controller('saved-spots')
export class SavedSpotsController {
  constructor(private readonly savedSpotsService: SavedSpotsService) {}

  @Get()
  getSavedSpots(
    @Req() req: Request,
    @Query('tripId') tripId?: string,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ) {
    return this.savedSpotsService.getSavedSpots({ tripId, limit, cursor }, baseUrlFromRequest(req));
  }

  @Post()
  @HttpCode(200)
  saveSpot(
    @Req() req: Request,
    @Body() body: { spotId: string; tripId?: string },
  ) {
    return this.savedSpotsService.saveSpot(body, baseUrlFromRequest(req));
  }

  @Delete(':spotId')
  unsaveSpot(
    @Param('spotId') spotId: string,
    @Query('tripId') tripId?: string,
  ) {
    return this.savedSpotsService.unsaveSpot(spotId, { tripId });
  }
}
