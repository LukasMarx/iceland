import { Module } from '@nestjs/common';
import { RoutesController } from './routes.controller';
import { RoutesService } from './routes.service';
import { PrismaService } from '../../prisma.service';
import { DemoContextService } from '../../common/demo-context.service';

@Module({
  controllers: [RoutesController],
  providers: [RoutesService, PrismaService, DemoContextService],
  exports: [RoutesService],
})
export class RoutesModule {}
