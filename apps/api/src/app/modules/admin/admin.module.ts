import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { OsmImportService } from './osm-import.service';

@Module({
  controllers: [AdminController],
  providers: [AdminService, OsmImportService],
  exports: [AdminService, OsmImportService],
})
export class AdminModule {}