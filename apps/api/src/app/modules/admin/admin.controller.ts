import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { Request } from 'express';
import { diskStorage } from 'multer';
import { extname, join } from 'node:path';
import { baseUrlFromRequest } from '../../common/image-url';
import { AdminGuard } from '../auth/admin.guard';
import { RequireAdmin } from '../auth/require-admin.decorator';
import { AdminService } from './admin.service';

const UPLOADS_DIR = join(process.cwd(), 'uploads', 'spots');

@Controller('admin')
@UseGuards(AdminGuard)
@RequireAdmin()
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('spots')
  listSpots(
    @Req() req: Request,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    return this.adminService.listSpots(
      page ? Number(page) : 1,
      limit ? Number(limit) : 20,
      search,
      baseUrlFromRequest(req),
    );
  }

  @Get('spots/:id')
  getSpot(@Req() req: Request, @Param('id') id: string) {
    return this.adminService.getSpot(id, baseUrlFromRequest(req));
  }

  @Post('spots')
  createSpot(@Body() data: Record<string, unknown>) {
    return this.adminService.createSpot(data);
  }

  @Patch('spots/:id')
  updateSpot(@Req() req: Request, @Param('id') id: string, @Body() data: Record<string, unknown>) {
    return this.adminService.updateSpot(id, data, baseUrlFromRequest(req));
  }

  @Delete('spots/:id')
  deleteSpot(@Param('id') id: string) {
    return this.adminService.deleteSpot(id);
  }

  @Post('spots/:id/images')
  @UseInterceptors(
    FilesInterceptor('files', 20, {
      storage: diskStorage({
        destination: UPLOADS_DIR,
        filename: (_req, file, callback) => {
          const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
          callback(null, `${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
    }),
  )
  uploadImages(
    @Req() req: Request,
    @Param('id') id: string,
    @UploadedFiles() files: Array<Express.Multer.File>,
  ) {
    return this.adminService.uploadSpotImages(id, files, baseUrlFromRequest(req));
  }

  @Put('spots/:id/images/reorder')
  reorderImages(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: { imageIds: string[] },
  ) {
    return this.adminService.reorderSpotImages(id, body.imageIds, baseUrlFromRequest(req));
  }

  @Delete('spots/:id/images/:imageId')
  deleteImage(
    @Param('id') id: string,
    @Param('imageId') imageId: string,
  ) {
    return this.adminService.deleteSpotImage(id, imageId);
  }
}