import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { DemoContextService } from '../../common/demo-context.service';

@Injectable()
export class OfflineService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly demoContext: DemoContextService,
  ) {}

  async cacheRegions(body: {
    tripId?: string;
    mode: string;
    label?: string;
    regions?: { lat: number; lon: number; radiusKm: number }[];
    includeRouteIds?: string[];
    includeSpotIds?: string[];
  }) {
    const tripId = body.tripId ?? this.demoContext.getTripId();
    const userId = this.demoContext.getUserId();

    const region = body.regions?.[0];
    const includes: string[] = [
      ...(body.includeRouteIds ?? []),
      ...(body.includeSpotIds ?? []),
    ];

    const job = await this.prisma.offlineCacheJob.create({
      data: {
        userId,
        tripId,
        mode: body.mode as any,
        state: 'queued',
        label: body.label ?? `Offline cache — ${body.mode}`,
        centerLat: region?.lat ?? null,
        centerLon: region?.lon ?? null,
        radiusKm: region?.radiusKm ?? null,
        includes,
        progressPercent: 0,
      },
    });

    return {
      cacheJobId: job.id,
      state: job.state,
      label: job.label,
      message: 'Cache job queued.',
    };
  }

  async getCacheJob(cacheJobId: string) {
    const job = await this.prisma.offlineCacheJob.findUnique({
      where: { id: cacheJobId },
    });

    if (!job) {
      throw new NotFoundException({ code: 'cache_job_not_found', message: `Cache job ${cacheJobId} not found.` });
    }

    return {
      cacheJobId: job.id,
      state: job.state,
      label: job.label,
      progressPercent: job.progressPercent,
      mode: job.mode,
      includes: job.includes,
      estimatedBytes: job.estimatedBytes ? Number(job.estimatedBytes) : null,
      errorCode: job.errorCode ?? null,
      errorMessage: job.errorMessage ?? null,
      completedAt: job.completedAt?.toISOString() ?? null,
      createdAt: job.createdAt.toISOString(),
    };
  }
}
