import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import type { DrivingPathRequest } from '@islandhub/domain';
import { RequireAuth } from '../auth/require-auth.decorator';
import { DrivingPathService } from './driving-path.service';

@RequireAuth()
@Controller('driving-paths')
export class DrivingPathController {
  constructor(private readonly drivingPathService: DrivingPathService) {}

  @Post()
  @HttpCode(200)
  getDrivingPath(@Body() body: DrivingPathRequest) {
    return this.drivingPathService.getDrivingPath(body);
  }
}
