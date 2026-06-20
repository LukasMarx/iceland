import { NotFoundException } from '@nestjs/common';
import { RouteCrudService } from './route-crud.service';

describe('RouteCrudService', () => {
  let service: RouteCrudService;
  let mockPrisma: any;
  let mockRequestContext: any;
  let mockTodayService: any;

  beforeEach(() => {
    mockPrisma = {
      trip: {
        findFirst: jest.fn(),
      },
      spot: {
        findUnique: jest.fn(),
      },
      route: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      routeStop: {
        create: jest.fn(),
        deleteMany: jest.fn(),
        delete: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      tripDay: {
        findFirst: jest.fn(),
      },
      savedSpot: {
        findMany: jest.fn(),
      },
    };
    mockRequestContext = {
      getTripId: jest.fn(),
    };
    mockTodayService = {
      getToday: jest.fn(),
    };
    service = new RouteCrudService(mockPrisma, mockRequestContext, mockTodayService);
  });

  describe('createRoute', () => {
    it('throws NotFoundException when trip is not found', async () => {
      mockRequestContext.getTripId.mockReturnValue('trip-1');
      mockPrisma.trip.findFirst.mockResolvedValue(null);

      await expect(
        service.createRoute({
          start: { type: 'custom' },
          direction: 'LOOP',
          spotIds: [],
          source: 'manual',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('creates a route with stops', async () => {
      mockRequestContext.getTripId.mockReturnValue('trip-1');
      mockPrisma.trip.findFirst.mockResolvedValue({
        activeHub: { id: 'hub-1', name: 'Hub', lat: 64.0, lon: -21.0 },
      });
      mockPrisma.spot.findUnique.mockResolvedValue({
        id: 'spot-1',
        lat: 64.1,
        lon: -21.1,
        visitMinutes: 30,
        translations: [{ locale: 'en', name: 'Test Spot' }],
      });
      mockPrisma.route.create.mockResolvedValue({ id: 'route-1' });
      mockPrisma.route.findUnique.mockResolvedValue({
        id: 'route-1',
        title: 'Test Route',
        stops: [],
      });

      const result = await service.createRoute({
        start: { type: 'custom' },
        direction: 'LOOP',
        spotIds: ['spot-1'],
        source: 'manual',
      });

      expect(result).toBeDefined();
      expect(result.route).toBeDefined();
      expect(mockPrisma.route.create).toHaveBeenCalled();
    });
  });

  describe('updateRoute', () => {
    it('throws NotFoundException when route is not found', async () => {
      mockPrisma.route.findFirst.mockResolvedValue(null);

      await expect(service.updateRoute('nonexistent', { title: 'New Title' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('removePlannedStop', () => {
    it('throws NotFoundException when route is not found', async () => {
      mockPrisma.route.findUnique.mockResolvedValue(null);

      await expect(service.removePlannedStop('nonexistent', 'stop-1', {})).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
