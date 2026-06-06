import { Module } from '@nestjs/common';
import { TripsController } from './trips.controller';
import { TripsService } from './trips.service';
import { PrismaService } from '../../prisma.service';

@Module({
  controllers: [TripsController],
  providers: [TripsService, PrismaService],
  exports: [TripsService],
})
export class TripsModule {}
