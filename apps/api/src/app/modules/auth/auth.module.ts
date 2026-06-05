import { Global, MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { PrismaService } from '../../prisma.service';
import { AdminGuard } from './admin.guard';
import { AppAuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { AuthTokensService } from './auth-tokens.service';
import { PasswordHasherService } from './password-hasher.service';
import { RequestContextMiddleware } from './request-context.middleware';
import { RequestContextService } from './request-context.service';
import { SocialLoginVerifierService } from './social-login-verifier.service';

@Global()
@Module({
  providers: [
    AuthService,
    AuthTokensService,
    PasswordHasherService,
    SocialLoginVerifierService,
    RequestContextService,
    RequestContextMiddleware,
    PrismaService,
    AdminGuard,
    {
      provide: APP_GUARD,
      useClass: AppAuthGuard,
    },
  ],
  exports: [AuthService, AuthTokensService, RequestContextService, AdminGuard],
})
export class AuthModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestContextMiddleware).forRoutes('*');
  }
}