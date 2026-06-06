import { Module } from '@nestjs/common';
import { OfflineController } from './offline.controller';
import { OfflineService } from './offline.service';
import { PrismaService } from '../../prisma.service';

@Module({
  controllers: [OfflineController],
  providers: [OfflineService, PrismaService],
})
export class OfflineModule {}
