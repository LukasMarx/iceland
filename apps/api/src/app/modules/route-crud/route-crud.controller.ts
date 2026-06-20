import {
  Body,
  Controller,
  Delete,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { baseUrlFromRequest } from '../../common/image-url';
import { RequireAuth } from '../auth/require-auth.decorator';
import { RouteCrudService } from './route-crud.service';

@RequireAuth()
@Controller()
export class RouteCrudController {
  constructor(private readonly routeCrudService: RouteCrudService) {}

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
    return this.routeCrudService.createRoute(body);
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
    return this.routeCrudService.updateRoute(routeId, body);
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
    return this.routeCrudService.addPlannedStop(routeId, body);
  }

  @Delete('routes/:routeId/stops/:stopId')
  removePlannedStop(
    @Param('routeId') routeId: string,
    @Param('stopId') stopId: string,
    @Query('tripId') tripId?: string,
    @Query('expectedVersion') expectedVersion?: string,
  ) {
    return this.routeCrudService.removePlannedStop(routeId, stopId, { tripId, expectedVersion });
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
    return this.routeCrudService.routePreview(body, baseUrlFromRequest(req));
  }
}
