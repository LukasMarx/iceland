import { Body, Controller, Get, HttpCode, Patch } from '@nestjs/common';
import { UsersService } from './users.service';

@Controller('me')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  getMe() {
    return this.usersService.getMe();
  }

  @Patch('preferences')
  @HttpCode(200)
  updatePreferences(
    @Body()
    body: {
      locale?: string;
      units?: string;
      temperatureUnit?: string;
      currency?: string;
      safety?: { pushAlertsTomorrowRoute?: boolean; notifyStatusWorsensEnRoute?: boolean };
    },
  ) {
    return this.usersService.updatePreferences(body);
  }
}
