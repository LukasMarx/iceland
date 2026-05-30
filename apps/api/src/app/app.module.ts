import { Module } from '@nestjs/common';
import { ApiDemoStateRepository } from './api-demo-state.repository';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma.service';

@Module({
  imports: [],
  controllers: [AppController],
  providers: [AppService, ApiDemoStateRepository, PrismaService],
})
export class AppModule {}
