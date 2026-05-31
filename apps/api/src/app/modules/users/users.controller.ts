import { Body, Controller, Get, HttpCode, Patch } from '@nestjs/common';
import { RequireAuth } from '../auth/require-auth.decorator';
import { UsersService } from './users.service';

@RequireAuth()
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
