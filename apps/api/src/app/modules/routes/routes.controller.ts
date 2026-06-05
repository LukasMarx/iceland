import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { baseUrlFromRequest } from '../../common/image-url';
import { RoutesService } from './routes.service';

@Controller()
export class RoutesController {
  constructor(private readonly routesService: RoutesService) {}

  // ─── Today ─────────────────────────────────────────────────────────────────

  @Get('today')
  getToday(@Query('tripId') tripId?: string, @Query('date') date?: string) {
    return this.routesService.getToday({ tripId, date });
  }

  @Post('routes/today')
  @HttpCode(200)
  createTodayRoute(
    @Body()
    body: {
      spotId?: string;
      routeId?: string;
      suggestionId?: string;
      tripId?: string;
      date?: string;
      replaceExisting?: boolean;
      expectedVersion?: number;
    },
  ) {
    return this.routesService.createTodayRoute(body);
  }

  @Post('routes/today/stops')
  @HttpCode(200)
  addTodayStop(
    @Body()
    body: {
      spotId: string;
      position: number | 'recommended' | 'end';
      tripId?: string;
      date?: string;
      allowUnsafe?: boolean;
      expectedVersion?: number;
    },
  ) {
    return this.routesService.addTodayStop(body);
  }

  @Post('routes/today/insert-preview')
  @HttpCode(200)
  insertPreview(
    @Req() req: Request,
    @Body() body: { spotId: string; tripId?: string; date?: string; positionMode?: string },
  ) {
    return this.routesService.insertPreview(body, baseUrlFromRequest(req));
  }

  @Patch('routes/today/stops/:stopId/done')
  markStopDone(
    @Param('stopId') stopId: string,
    @Body()
    body: {
      tripId?: string;
      date?: string;
      completedAt?: string;
      undo?: boolean;
      expectedVersion?: number;
    },
  ) {
    return this.routesService.markStopDone(stopId, body ?? {});
  }

  // ─── Suggestions ───────────────────────────────────────────────────────────

  @Get('routes/suggestions')
  getRouteSuggestions(
    @Req() req: Request,
    @Query('tripId') tripId?: string,
    @Query('date') date?: string,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ) {
    return this.routesService.getRouteSuggestions({ tripId, date, limit, cursor }, baseUrlFromRequest(req));
  }

  @Post('routes/suggestions/start')
  @HttpCode(200)
  startSuggestedRoute(
    @Body()
    body: {
      suggestionId: string;
      tripId?: string;
      date?: string;
      replaceExisting?: boolean;
      expectedVersion?: number;
    },
  ) {
    return this.routesService.startSuggestedRoute(body);
  }

  // ─── Route CRUD ────────────────────────────────────────────────────────────

  @Post('routes')
  @HttpCode(201)
  createRoute(
    @Body()
    body: {
      tripId?: string;
      title?: string;
      date?: string;
      start: { id?: string; name?: string; type: string; location?: { lat: number; lon: number } };
      destination?: { id?: string; name?: string; type: string; location?: { lat: number; lon: number } };
      direction: 'ONE-WAY' | 'LOOP';
      spotIds: string[];
      source: string;
      makeActiveToday?: boolean;
      replaceExistingToday?: boolean;
    },
  ) {
    return this.routesService.createRoute(body);
  }

  @Patch('routes/:routeId')
  updateRoute(
    @Param('routeId') routeId: string,
    @Body()
    body: {
      tripId?: string;
      title?: string;
      start?: { id?: string; name?: string; type: string; location?: { lat: number; lon: number } };
      destination?: { id?: string; name?: string; type: string; location?: { lat: number; lon: number } };
      spotIds?: string[];
      direction?: 'ONE-WAY' | 'LOOP';
      expectedVersion?: number;
    },
  ) {
    return this.routesService.updateRoute(routeId, body);
  }

  @Post('routes/:routeId/stops')
  @HttpCode(200)
  addPlannedStop(
    @Param('routeId') routeId: string,
    @Body()
    body: {
      tripId?: string;
      spotId: string;
      position?: number | 'recommended' | 'end';
      allowUnsafe?: boolean;
      expectedVersion?: number;
    },
  ) {
    return this.routesService.addPlannedStop(routeId, body);
  }

  @Delete('routes/:routeId/stops/:stopId')
  removePlannedStop(
    @Param('routeId') routeId: string,
    @Param('stopId') stopId: string,
    @Query('tripId') tripId?: string,
    @Query('expectedVersion') expectedVersion?: string,
  ) {
    return this.routesService.removePlannedStop(routeId, stopId, { tripId, expectedVersion });
  }

  @Post('routes/preview')
  @HttpCode(200)
  routePreview(
    @Req() req: Request,
    @Body()
    body: {
      tripId?: string;
      date?: string;
      start: { id?: string; name?: string; type: string; location?: { lat: number; lon: number } };
      destination?: { id?: string; name?: string; type: string; location?: { lat: number; lon: number } };
      mode: 'return' | 'one-way' | 'insert-spot' | 'edit-route';
      routeId?: string;
      spotIds?: string[];
      targetSpotId?: string;
      vehicle?: string;
      maxCandidates?: number;
    },
  ) {
    return this.routesService.routePreview(body, baseUrlFromRequest(req));
  }
}
