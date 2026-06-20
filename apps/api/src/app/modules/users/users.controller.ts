import { Body, Controller, Get, HttpCode, Patch, UnauthorizedException } from '@nestjs/common';
import { RequestContextService } from '../auth/request-context.service';
import { RequireAuth } from '../auth/require-auth.decorator';
import { UsersService } from './users.service';

@RequireAuth()
@Controller('me')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly requestContext: RequestContextService,
  ) {}

  @Get()
  getMe() {
    const userId = this.requestContext.getUserId();
    if (!userId) throw new UnauthorizedException('Authentication required');
    return this.usersService.getMe(userId);
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
    const userId = this.requestContext.getUserId();
    if (!userId) throw new UnauthorizedException('Authentication required');
    return this.usersService.updatePreferences(userId, body);
  }
}
