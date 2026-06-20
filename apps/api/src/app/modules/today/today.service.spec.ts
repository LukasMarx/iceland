import { NotFoundException } from '@nestjs/common';
import { TodayRouteService } from './today.service';

describe('TodayRouteService', () => {
  let service: TodayRouteService;
  let mockPrisma: any;
  let mockRequestContext: any;

  beforeEach(() => {
    mockPrisma = {
      route: {
        findFirst: jest.fn(),
      },
    };
    mockRequestContext = {
      getTripId: jest.fn(),
    };
    service = new TodayRouteService(mockPrisma, mockRequestContext);
  });

  describe('getToday', () => {
    it('throws NotFoundException when no active route exists', async () => {
      mockRequestContext.getTripId.mockReturnValue('trip-1');
      mockPrisma.route.findFirst.mockResolvedValue(null);

      await expect(service.getToday({})).rejects.toThrow(NotFoundException);
      await expect(service.getToday({})).rejects.toThrow('No active route for today.');
    });

    it('returns formatted today response when route exists', async () => {
      mockRequestContext.getTripId.mockReturnValue('trip-1');
      const mockRoute = {
        id: 'route-1',
        title: 'Test Route',
        totalDriveMinutes: 60,
        version: 1,
        stops: [
          {
            id: 'stop-1',
            spotId: 'spot-1',
            title: 'Test Stop',
            lat: 64.0,
            lon: -21.0,
            state: 'active',
            statusLevel: 'green',
            statusReason: '',
            driveMinutesFromPrevious: 30,
          },
        ],
      };
      mockPrisma.route.findFirst.mockResolvedValue(mockRoute);

      const result = await service.getToday({});

      expect(result).toBeDefined();
      expect(result.tripId).toBe('trip-1');
      expect(result.title).toBe('Test Route');
      expect(result.stops).toHaveLength(1);
    });
  });
});
