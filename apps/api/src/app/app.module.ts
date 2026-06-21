import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { OnboardingModule } from './modules/onboarding/onboarding.module';
import { ExploreModule } from './modules/explore/explore.module';
import { TodayModule } from './modules/today/today.module';
import { SuggestionModule } from './modules/suggestions/suggestions.module';
import { RouteCrudModule } from './modules/route-crud/route-crud.module';
import { SavedSpotsModule } from './modules/saved-spots/saved-spots.module';
import { TripsModule } from './modules/trips/trips.module';
import { PlacesModule } from './modules/places/places.module';
import { OfflineModule } from './modules/offline/offline.module';
import { AdminModule } from './modules/admin/admin.module';
import { DrivingPathModule } from './modules/driving-path/driving-path.module';

@Module({
  imports: [
    AuthModule,
    UsersModule,
    OnboardingModule,
    ExploreModule,
    TodayModule,
    SuggestionModule,
    RouteCrudModule,
    SavedSpotsModule,
    TripsModule,
    PlacesModule,
    OfflineModule,
    AdminModule,
    DrivingPathModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
