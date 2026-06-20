import { Module } from '@nestjs/common';
import { RouteCrudController } from './route-crud.controller';
import { RouteCrudService } from './route-crud.service';
import { TodayModule } from '../today/today.module';

@Module({
  imports: [TodayModule],
  controllers: [RouteCrudController],
  providers: [RouteCrudService],
  exports: [RouteCrudService],
})
export class RouteCrudModule {}
