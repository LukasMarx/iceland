import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import type { AddRouteStopRequest, CreateTodayRouteRequest, ExploreQuery, InsertPreviewRequest, PlanSpotRequest, SafetyStatus, SaveSpotRequest, StartSuggestedRouteRequest, VehicleProfile } from '@islandhub/api-contracts';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getData() {
    return this.appService.getData();
  }

  @Get('health')
  getHealth() {
    return this.appService.getHealth();
  }

  @Get('explore')
  getExplore(
    @Query('status') status?: string,
    @Query('category') category?: string,
    @Query('vehicle') vehicle?: VehicleProfile | 'any',
    @Query('showFRoads') showFRoads?: string,
    @Query('maxDriveMinutes') maxDriveMinutes?: string,
  ) {
    const query: ExploreQuery = {
      statuses: status ? status.split(',').filter(Boolean) as SafetyStatus[] : undefined,
      categories: category ? category.split(',').filter(Boolean) : undefined,
      vehicle,
      showFRoads: showFRoads === 'true',
      maxDriveMinutes: maxDriveMinutes ? Number(maxDriveMinutes) : undefined,
    };

    return this.appService.getExplore(query);
  }

  @Get('spots/:id/context')
  getSpotContext(@Param('id') id: string) {
    return this.appService.getSpotContext(id);
  }

  @Get('today')
  getToday() {
    return this.appService.getToday();
  }

  @Post('routes/today/insert-preview')
  previewInsert(@Body() request: InsertPreviewRequest) {
    return this.appService.previewInsert(request.spotId);
  }

  @Post('routes/today/stops')
  addRouteStop(@Body() request: AddRouteStopRequest) {
    return this.appService.addRouteStop(request.spotId, request.position);
  }

  @Post('routes/today')
  createTodayRoute(@Body() request: CreateTodayRouteRequest) {
    return this.appService.createTodayRoute(request.spotId);
  }

  @Get('routes/suggestions')
  getRouteSuggestions() {
    return this.appService.getRouteSuggestions();
  }

  @Post('routes/suggestions/start')
  startSuggestedRoute(@Body() request: StartSuggestedRouteRequest) {
    return this.appService.startSuggestedRoute(request.routeId);
  }

  @Patch('routes/today/stops/:id/done')
  markStopDone(@Param('id') id: string) {
    return this.appService.markStopDone(id);
  }

  @Post('saved-spots')
  saveSpot(@Body() request: SaveSpotRequest) {
    return this.appService.saveSpot(request.spotId);
  }

  @Get('saved-spots')
  getSavedSpots() {
    return this.appService.getSavedSpots();
  }

  @Post('draft-days')
  planSpotForLater(@Body() request: PlanSpotRequest) {
    return this.appService.planSpotForLater(request.spotId);
  }

  @Get('trip')
  getTrip() {
    return this.appService.getTrip();
  }
}
