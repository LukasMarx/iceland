import { Module } from '@nestjs/common';
import { PlacesController } from './places.controller';
import { PlacesService } from './places.service';
import { PrismaService } from '../../prisma.service';
import { DemoContextService } from '../../common/demo-context.service';

@Module({
  controllers: [PlacesController],
  providers: [PlacesService, PrismaService, DemoContextService],
})
export class PlacesModule {}
