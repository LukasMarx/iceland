import { Module } from '@nestjs/common';
import { TripsController } from './trips.controller';
import { TripsService } from './trips.service';
import { PrismaService } from '../../prisma.service';
import { DemoContextService } from '../../common/demo-context.service';

@Module({
  controllers: [TripsController],
  providers: [TripsService, PrismaService, DemoContextService],
  exports: [TripsService],
})
export class TripsModule {}
