import { Module } from '@nestjs/common';
import { OfflineController } from './offline.controller';
import { OfflineService } from './offline.service';
import { PrismaService } from '../../prisma.service';
import { DemoContextService } from '../../common/demo-context.service';

@Module({
  controllers: [OfflineController],
  providers: [OfflineService, PrismaService, DemoContextService],
})
export class OfflineModule {}
