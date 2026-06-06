import { Module } from '@nestjs/common';
import { SavedSpotsController } from './saved-spots.controller';
import { SavedSpotsService } from './saved-spots.service';
import { PrismaService } from '../../prisma.service';

@Module({
  controllers: [SavedSpotsController],
  providers: [SavedSpotsService, PrismaService],
  exports: [SavedSpotsService],
})
export class SavedSpotsModule {}
