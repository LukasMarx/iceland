import {
  Body,
  Controller,
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
import { RequireAuth } from '../auth/require-auth.decorator';
import { TodayRouteService } from './today.service';

@RequireAuth()
@Controller()
export class TodayController {
  constructor(private readonly todayService: TodayRouteService) {}

  @Get('today')
  getToday(@Query('tripId') tripId?: string, @Query('date') date?: string) {
    return this.todayService.getToday({ tripId, date });
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
    return this.todayService.createTodayRoute(body);
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
    return this.todayService.addTodayStop(body);
  }

  @Post('routes/today/insert-preview')
  @HttpCode(200)
  insertPreview(
    @Req() req: Request,
    @Body() body: { spotId: string; tripId?: string; date?: string; positionMode?: string },
  ) {
    return this.todayService.insertPreview(body, baseUrlFromRequest(req));
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
    return this.todayService.markStopDone(stopId, body ?? {});
  }
}
