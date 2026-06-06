import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { OsmImportService } from './osm-import.service';

@Module({
  controllers: [AdminController],
  providers: [AdminService, OsmImportService, PrismaService],
  exports: [AdminService, OsmImportService],
})
export class AdminModule {}