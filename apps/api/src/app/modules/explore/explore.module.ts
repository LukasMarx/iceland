import { Module } from '@nestjs/common';
import { ExploreController } from './explore.controller';
import { ExploreService } from './explore.service';
import { PrismaService } from '../../prisma.service';
import { DemoContextService } from '../../common/demo-context.service';

@Module({
  controllers: [ExploreController],
  providers: [ExploreService, PrismaService, DemoContextService],
  exports: [ExploreService],
})
export class ExploreModule {}
