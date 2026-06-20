import { Module } from '@nestjs/common';
import { TodayController } from './today.controller';
import { TodayRouteService } from './today.service';

@Module({
  controllers: [TodayController],
  providers: [TodayRouteService],
  exports: [TodayRouteService],
})
export class TodayModule {}
