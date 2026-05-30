import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { OnboardingService } from './onboarding.service';

@Controller('onboarding')
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

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
    return this.onboardingService.completeOnboarding(body);
  }
}
