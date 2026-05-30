import { Module } from '@nestjs/common';
import { ApiDemoStateRepository } from './api-demo-state.repository';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma.service';
import { UsersModule } from './modules/users/users.module';
import { OnboardingModule } from './modules/onboarding/onboarding.module';
import { ExploreModule } from './modules/explore/explore.module';
import { RoutesModule } from './modules/routes/routes.module';
import { SavedSpotsModule } from './modules/saved-spots/saved-spots.module';
import { TripsModule } from './modules/trips/trips.module';
import { PlacesModule } from './modules/places/places.module';
import { OfflineModule } from './modules/offline/offline.module';

@Module({
  imports: [
    UsersModule,
    OnboardingModule,
    ExploreModule,
    RoutesModule,
    SavedSpotsModule,
    TripsModule,
    PlacesModule,
    OfflineModule,
  ],
  controllers: [AppController],
  providers: [AppService, ApiDemoStateRepository, PrismaService],
})
export class AppModule {}
