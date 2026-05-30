import { Body, Controller, Delete, Get, HttpCode, Param, Post, Query } from '@nestjs/common';
import { SavedSpotsService } from './saved-spots.service';

@Controller('saved-spots')
export class SavedSpotsController {
  constructor(private readonly savedSpotsService: SavedSpotsService) {}

  @Get()
  getSavedSpots(
    @Query('tripId') tripId?: string,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ) {
    return this.savedSpotsService.getSavedSpots({ tripId, limit, cursor });
  }

  @Post()
  @HttpCode(200)
  saveSpot(@Body() body: { spotId: string; tripId?: string }) {
    return this.savedSpotsService.saveSpot(body);
  }

  @Delete(':spotId')
  unsaveSpot(
    @Param('spotId') spotId: string,
    @Query('tripId') tripId?: string,
  ) {
    return this.savedSpotsService.unsaveSpot(spotId, { tripId });
  }
}
