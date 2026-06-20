import { NotFoundException } from '@nestjs/common';
import { SuggestionService } from './suggestions.service';

describe('SuggestionService', () => {
  let service: SuggestionService;
  let mockPrisma: any;
  let mockRequestContext: any;
  let mockTodayService: any;

  beforeEach(() => {
    mockPrisma = {
      trip: {
        findFirst: jest.fn(),
      },
      savedSpot: {
        findMany: jest.fn(),
      },
      routeSuggestionCache: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        upsert: jest.fn(),
      },
    };
    mockRequestContext = {
      getTripId: jest.fn(),
    };
    mockTodayService = {
      createTodayRoute: jest.fn(),
    };
    service = new SuggestionService(mockPrisma, mockRequestContext, mockTodayService);
  });

  describe('getRouteSuggestions', () => {
    it('returns empty suggestions when no saved spots exist', async () => {
      mockRequestContext.getTripId.mockReturnValue('trip-1');
      mockPrisma.trip.findFirst.mockResolvedValue({ activeHub: null });
      mockPrisma.savedSpot.findMany.mockResolvedValue([]);
      mockPrisma.routeSuggestionCache.findMany.mockResolvedValue([]);

      const result = await service.getRouteSuggestions({});

      expect(result.savedSpots).toEqual([]);
      expect(result.routes).toEqual([]);
    });

    it('returns cached suggestions when available', async () => {
      mockRequestContext.getTripId.mockReturnValue('trip-1');
      mockPrisma.trip.findFirst.mockResolvedValue({ activeHub: null });
      mockPrisma.savedSpot.findMany.mockResolvedValue([]);
      mockPrisma.routeSuggestionCache.findMany.mockResolvedValue([
        {
          suggestionId: 'sug-1',
          payload: { title: 'Cached Route' },
          reason: 'Test reason',
          expiresAt: new Date(Date.now() + 3600000),
        },
      ]);

      const result = await service.getRouteSuggestions({});

      expect(result.routes).toHaveLength(1);
      expect(result.routes[0].suggestionId).toBe('sug-1');
    });
  });

  describe('startSuggestedRoute', () => {
    it('throws NotFoundException when suggestion is expired', async () => {
      mockRequestContext.getTripId.mockReturnValue('trip-1');
      mockPrisma.routeSuggestionCache.findFirst.mockResolvedValue(null);

      await expect(
        service.startSuggestedRoute({ suggestionId: 'expired-sug' }),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.startSuggestedRoute({ suggestionId: 'expired-sug' }),
      ).rejects.toThrow('Route suggestion not found or expired.');
    });

    it('calls todayService.createTodayRoute with suggestionId', async () => {
      mockRequestContext.getTripId.mockReturnValue('trip-1');
      mockPrisma.routeSuggestionCache.findFirst.mockResolvedValue({
        suggestionId: 'sug-1',
        expiresAt: new Date(Date.now() + 3600000),
      });
      mockTodayService.createTodayRoute.mockResolvedValue({ today: {} });

      await service.startSuggestedRoute({ suggestionId: 'sug-1' });

      expect(mockTodayService.createTodayRoute).toHaveBeenCalledWith(
        expect.objectContaining({ suggestionId: 'sug-1' }),
      );
    });
  });
});
