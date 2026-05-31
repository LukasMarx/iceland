import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(201)
  register(
    @Body()
    body: {
      email?: string;
      password?: string;
      displayName?: string;
    },
  ) {
    return this.authService.register(body);
  }

  @Post('login')
  @HttpCode(200)
  login(
    @Body()
    body: {
      email?: string;
      password?: string;
    },
  ) {
    return this.authService.login(body);
  }

  @Post('social')
  @HttpCode(200)
  socialLogin(
    @Body()
    body: {
      provider?: 'google' | 'apple';
      idToken?: string;
      displayName?: string;
    },
  ) {
    return this.authService.loginWithSocial(body);
  }
}