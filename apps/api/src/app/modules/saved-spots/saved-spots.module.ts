import { Module } from '@nestjs/common';
import { SavedSpotsController } from './saved-spots.controller';
import { SavedSpotsService } from './saved-spots.service';
import { PrismaService } from '../../prisma.service';
import { DemoContextService } from '../../common/demo-context.service';

@Module({
  controllers: [SavedSpotsController],
  providers: [SavedSpotsService, PrismaService, DemoContextService],
  exports: [SavedSpotsService],
})
export class SavedSpotsModule {}
