import { Module } from '@nestjs/common';
import { DrivingPathController } from './driving-path.controller';
import { DrivingPathService } from './driving-path.service';
import { StubRoutingProvider } from './stub-routing.provider';
import { ROUTING_PROVIDER } from './routing-provider.interface';

@Module({
  controllers: [DrivingPathController],
  providers: [
    DrivingPathService,
    { provide: ROUTING_PROVIDER, useClass: StubRoutingProvider },
  ],
  exports: [DrivingPathService],
})
export class DrivingPathModule {}
