import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { baseUrlFromRequest } from '../../common/image-url';
import { RequireAuth } from '../auth/require-auth.decorator';
import { SuggestionService } from './suggestions.service';

@RequireAuth()
@Controller('routes/suggestions')
export class SuggestionController {
  constructor(private readonly suggestionService: SuggestionService) {}

  @Get()
  getRouteSuggestions(
    @Req() req: Request,
    @Query('tripId') tripId?: string,
    @Query('date') date?: string,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ) {
    return this.suggestionService.getRouteSuggestions({ tripId, date, limit, cursor }, baseUrlFromRequest(req));
  }

  @Post('start')
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
    return this.suggestionService.startSuggestedRoute(body);
  }
}
