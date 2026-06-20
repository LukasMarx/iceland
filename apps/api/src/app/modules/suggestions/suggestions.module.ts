import { Module } from '@nestjs/common';
import { SuggestionController } from './suggestions.controller';
import { SuggestionService } from './suggestions.service';
import { TodayModule } from '../today/today.module';

@Module({
  imports: [TodayModule],
  controllers: [SuggestionController],
  providers: [SuggestionService],
  exports: [SuggestionService],
})
export class SuggestionModule {}
