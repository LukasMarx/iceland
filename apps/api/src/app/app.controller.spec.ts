import { Test, TestingModule } from '@nestjs/testing';
import { ApiDemoStateRepository } from './api-demo-state.repository';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma.service';

process.env.DATABASE_URL = 'file:./prisma/controller.test.db';

describe('AppController', () => {
  let app: TestingModule;
  let appController: AppController;
  let stateRepository: ApiDemoStateRepository;

  beforeAll(async () => {
    app = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService, ApiDemoStateRepository, PrismaService],
    }).compile();

    appController = app.get<AppController>(AppController);
    stateRepository = app.get<ApiDemoStateRepository>(ApiDemoStateRepository);
  });

  beforeEach(async () => {
    await stateRepository.reset();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('getData', () => {
    it('should return health metadata', () => {
      expect(appController.getData()).toMatchObject({ status: 'ok', service: 'islandhub-api' });
    });
  });

  describe('route and spot actions', () => {
    it('creates a today route from a spot', async () => {
      const response = await appController.createTodayRoute({ spotId: 'geysir' });

      expect(response.today).toMatchObject({
        title: 'Geysir out-and-back',
        stopProgress: '0/1',
      });
    });

    it('saves and plans spots', async () => {
      const saved = await appController.saveSpot({ spotId: 'bruarfoss' });
      const savedSpots = await appController.getSavedSpots();
      const planned = await appController.planSpotForLater({ spotId: 'bruarfoss' });

      expect(saved.savedSpotIds).toContain('bruarfoss');
      expect(savedSpots.savedSpotIds).toContain('bruarfoss');
      expect(planned.trip.days.some((day) => day.title === 'Draft - Bruarfoss')).toBe(true);
    });

    it('starts a suggested route', async () => {
      const suggestions = await appController.getRouteSuggestions();
      const response = await appController.startSuggestedRoute({ routeId: 'wind-light-loop' });

      expect(suggestions.routes[0].id).toEqual('wind-light-loop');
      expect(response.today.title).toEqual('Wind-light loop');
    });
  });
});
