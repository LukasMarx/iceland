import { Controller, Get, Query, Req } from '@nestjs/common';
import { Request } from 'express';
import { baseUrlFromRequest } from '../../common/image-url';
import { PlacesService } from './places.service';

@Controller()
export class PlacesController {
  constructor(private readonly placesService: PlacesService) {}

  @Get('places/search')
  searchPlaces(
    @Query('q') q?: string,
    @Query('type') type?: string,
    @Query('locale') locale?: string,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ) {
    return this.placesService.searchPlaces({ q, type, locale, limit, cursor });
  }

  @Get('hotels/search')
  searchHotels(
    @Req() req: Request,
    @Query('q') q?: string,
    @Query('lat') lat?: string,
    @Query('lon') lon?: string,
    @Query('radiusKm') radiusKm?: string,
    @Query('stars') stars?: string,
    @Query('locale') locale?: string,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ) {
    return this.placesService.searchHotels({ q, lat, lon, radiusKm, stars, locale, limit, cursor }, baseUrlFromRequest(req));
  }
}
