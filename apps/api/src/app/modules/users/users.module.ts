import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { PrismaService } from '../../prisma.service';
import { DemoContextService } from '../../common/demo-context.service';

@Module({
  controllers: [UsersController],
  providers: [UsersService, PrismaService, DemoContextService],
  exports: [UsersService],
})
export class UsersModule {}
