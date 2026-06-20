import { Module } from '@nestjs/common';
import { SavedSpotsController } from './saved-spots.controller';
import { SavedSpotsService } from './saved-spots.service';

@Module({
  controllers: [SavedSpotsController],
  providers: [SavedSpotsService],
  exports: [SavedSpotsService],
})
export class SavedSpotsModule {}
