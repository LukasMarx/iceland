import { Body, Controller, HttpCode, Post, UnauthorizedException } from '@nestjs/common';
import { RequestContextService } from '../auth/request-context.service';
import { RequireAuth } from '../auth/require-auth.decorator';
import { OnboardingService } from './onboarding.service';

@RequireAuth()
@Controller('onboarding')
export class OnboardingController {
  constructor(
    private readonly onboardingService: OnboardingService,
    private readonly requestContext: RequestContextService,
  ) {}

  @Post()
  @HttpCode(201)
  completeOnboarding(
    @Body()
    body: {
      locale: string;
      planningPhase: 'ideas' | 'fixed_hub' | 'roadtrip';
      dateRange: { startsOn: string; endsOn: string };
      vehicle: 'car_2wd' | 'car_4wd' | 'unknown';
      hub?: { id?: string; name?: string; type: string; location?: { lat: number; lon: number } };
    },
  ) {
    const userId = this.requestContext.getUserId();
    if (!userId) throw new UnauthorizedException('Authentication required');
    return this.onboardingService.completeOnboarding(userId, body);
  }
}
