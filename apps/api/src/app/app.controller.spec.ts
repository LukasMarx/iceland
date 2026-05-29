import { Test, TestingModule } from '@nestjs/testing';
import { ApiDemoStateRepository } from './api-demo-state.repository';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let app: TestingModule;

  beforeAll(async () => {
    app = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService, ApiDemoStateRepository],
    }).compile();
  });

  describe('getData', () => {
    it('should return health metadata', () => {
      const appController = app.get<AppController>(AppController);
      expect(appController.getData()).toMatchObject({ status: 'ok', service: 'islandhub-api' });
    });
  });

  describe('route and spot actions', () => {
    it('creates a today route from a spot', () => {
      const appController = app.get<AppController>(AppController);

      expect(appController.createTodayRoute({ spotId: 'geysir' }).today).toMatchObject({
        title: 'Geysir out-and-back',
        stopProgress: '0/1',
      });
    });

    it('saves and plans spots', () => {
      const appController = app.get<AppController>(AppController);

      expect(appController.saveSpot({ spotId: 'bruarfoss' }).savedSpotIds).toContain('bruarfoss');
      expect(appController.getSavedSpots().savedSpotIds).toContain('bruarfoss');
      expect(appController.planSpotForLater({ spotId: 'bruarfoss' }).trip.days.some((day) => day.title === 'Draft - Bruarfoss')).toBe(true);
    });

    it('starts a suggested route', () => {
      const appController = app.get<AppController>(AppController);

      expect(appController.getRouteSuggestions().routes[0].id).toEqual('wind-light-loop');
      expect(appController.startSuggestedRoute({ routeId: 'wind-light-loop' }).today.title).toEqual('Wind-light loop');
    });
  });
});
