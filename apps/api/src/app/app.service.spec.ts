import { Test, TestingModule } from '@nestjs/testing';
import { ApiDemoStateRepository } from './api-demo-state.repository';
import { AppService } from './app.service';
import { PrismaService } from './prisma.service';

process.env.DATABASE_URL = 'file:./prisma/service.test.db';

describe('AppService', () => {
  let service: AppService;
  let app: TestingModule;
  let stateRepository: ApiDemoStateRepository;

  beforeEach(async () => {
    app = await Test.createTestingModule({
      providers: [AppService, ApiDemoStateRepository, PrismaService],
    }).compile();

    service = app.get<AppService>(AppService);
    stateRepository = app.get<ApiDemoStateRepository>(ApiDemoStateRepository);
    await stateRepository.reset();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('getData', () => {
    it('should return health metadata', () => {
      expect(service.getData()).toMatchObject({ status: 'ok', service: 'islandhub-api', mode: 'seed' });
    });
  });

  describe('getExplore', () => {
    it('returns seed spots with safety status', () => {
      expect(service.getExplore().spots.some((spot) => spot.status.reasons.length > 0)).toBe(true);
    });

    it('filters F-roads for 2WD unless explicitly visible', () => {
      expect(service.getExplore({ vehicle: 'car_2wd', showFRoads: false }).spots.some((spot) => spot.isFRoad)).toBe(false);
      expect(service.getExplore({ vehicle: 'car_2wd', showFRoads: true, maxDriveMinutes: 180 }).spots.some((spot) => spot.isFRoad)).toBe(true);
    });
  });

  describe('routes', () => {
    it('previews inserting a spot into today route', () => {
      expect(service.previewInsert('seljalandsfoss')).toMatchObject({
        recommendedAfterStopId: 'geysir',
        recommendedBeforeStopId: 'gullfoss',
        addedDriveMinutes: 18,
      });
    });

    it('marks active stop done and advances the route', async () => {
      const response = await service.markStopDone('seljalandsfoss');

      expect(response.today.stopProgress).toContain('/');
      expect(response.today.stops.find((stop) => stop.id === 'bruarfoss')?.state).toEqual('active');
    });

    it('creates an out-and-back route from a spot', async () => {
      const response = await service.createTodayRoute('geysir');

      expect(response.today.title).toEqual('Geysir out-and-back');
      expect(response.today.stopProgress).toEqual('0/1');
      expect(response.today.stops.map((stop) => stop.id)).toEqual(['start', 'geysir', 'return']);
      expect(response.today.stops.find((stop) => stop.id === 'geysir')?.state).toEqual('active');
    });
  });

  describe('spot actions', () => {
    it('saves spots idempotently', async () => {
      await service.saveSpot('geysir');
      const response = await service.saveSpot('geysir');

      expect(response.savedSpotIds.filter((spotId) => spotId === 'geysir')).toHaveLength(1);
      expect(response.message).toContain('saved');
    });

    it('plans a spot on a draft day once', async () => {
      await service.planSpotForLater('bruarfoss');
      const response = await service.planSpotForLater('bruarfoss');

      expect(response.trip.days.filter((day) => day.title === 'Draft - Bruarfoss')).toHaveLength(1);
      expect(response.message).toContain('already');
    });
  });

  describe('route suggestions', () => {
    it('builds suggestions from saved spots', async () => {
      const response = await service.getRouteSuggestions();

      expect(response.savedSpots.map((spot) => spot.id)).toEqual(['geysir', 'gullfoss', 'thingvellir', 'bruarfoss', 'kerid']);
      expect(response.routes.map((route) => route.id)).toEqual(['wind-light-loop', 'craters-geothermal', 'south-extended']);
      expect(response.routes[0]).toMatchObject({ title: 'Wind-light loop', stops: 4, distanceKm: 168 });
    });

    it('starts a suggested route into today', async () => {
      const response = await service.startSuggestedRoute('wind-light-loop');

      expect(response.today.title).toEqual('Wind-light loop');
      expect(response.today.stopProgress).toEqual('2/4');
      expect(response.today.stops.find((stop) => stop.id === 'seljalandsfoss')?.state).toEqual('active');
    });
  });
});
