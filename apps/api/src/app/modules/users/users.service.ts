import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        preferences: true,
        emergencyContacts: true,
        entitlements: { where: { validUntil: null } },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const prefs = user.preferences;
    const offlineCacheJob = await this.prisma.offlineCacheJob.findFirst({
      where: { userId, state: 'completed' },
      orderBy: { completedAt: 'desc' },
    });

    return {
      user: {
        id: user.id,
        displayName: user.displayName,
        initials: user.initials,
        email: user.email ?? '',
        joinedAt: user.joinedAt.toISOString(),
      },
      subscription: {
        plan: user.subscription,
        trialAvailable: user.subscription === 'free',
        headline: user.subscription === 'premium'
          ? 'Live re-checks every 15 min, night-before route alerts.'
          : 'Live re-checks every 15 min, night-before route alerts.',
        subcopy: 'Sicherheits-Basiswarnungen sind und bleiben kostenlos.',
      },
      preferences: {
        locale: prefs?.locale ?? 'en',
        units: prefs?.units ?? 'metric',
        temperatureUnit: prefs?.temperatureUnit ?? 'C',
        currency: prefs?.currency ?? 'EUR',
      },
      safety: {
        pushAlertsTomorrowRoute: prefs?.pushAlertsTomorrowRoute ?? true,
        notifyStatusWorsensEnRoute: prefs?.notifyStatusWorsensEnRoute ?? true,
        emergencyContactsCount: user.emergencyContacts.length,
      },
      offline: {
        cachedMapAreaLabel: offlineCacheJob ? this.cacheLabel(offlineCacheJob) : undefined,
        cachedTodayRouteStops: offlineCacheJob?.includes?.length,
        lastSyncedAt: offlineCacheJob?.completedAt?.toISOString(),
      },
    };
  }

  async updatePreferences(userId: string, body: {
    locale?: string;
    units?: string;
    temperatureUnit?: string;
    currency?: string;
    safety?: { pushAlertsTomorrowRoute?: boolean; notifyStatusWorsensEnRoute?: boolean };
  }) {
    const update: Record<string, unknown> = {};
    if (body.locale) update['locale'] = body.locale;
    if (body.units) update['units'] = body.units;
    if (body.temperatureUnit) update['temperatureUnit'] = body.temperatureUnit;
    if (body.currency) update['currency'] = body.currency;
    if (body.safety?.pushAlertsTomorrowRoute !== undefined) {
      update['pushAlertsTomorrowRoute'] = body.safety.pushAlertsTomorrowRoute;
    }
    if (body.safety?.notifyStatusWorsensEnRoute !== undefined) {
      update['notifyStatusWorsensEnRoute'] = body.safety.notifyStatusWorsensEnRoute;
    }

    const prefs = await this.prisma.userPreference.upsert({
      where: { userId },
      create: {
        userId,
        locale: (body.locale ?? 'en') as 'en' | 'de' | 'is',
        units: (body.units ?? 'metric') as 'metric' | 'imperial',
        temperatureUnit: (body.temperatureUnit ?? 'C') as 'C' | 'F',
        currency: (body.currency ?? 'EUR') as 'EUR' | 'ISK' | 'USD' | 'GBP',
        pushAlertsTomorrowRoute: body.safety?.pushAlertsTomorrowRoute ?? true,
        notifyStatusWorsensEnRoute: body.safety?.notifyStatusWorsensEnRoute ?? true,
      },
      update,
    });

    const contacts = await this.prisma.emergencyContact.count({ where: { userId } });

    return {
      preferences: {
        locale: prefs.locale,
        units: prefs.units,
        temperatureUnit: prefs.temperatureUnit,
        currency: prefs.currency,
      },
      safety: {
        pushAlertsTomorrowRoute: prefs.pushAlertsTomorrowRoute,
        notifyStatusWorsensEnRoute: prefs.notifyStatusWorsensEnRoute,
        emergencyContactsCount: contacts,
      },
      message: 'Preferences updated.',
    };
  }

  private cacheLabel(job: { label: string; radiusKm: number | null }) {
    return job.radiusKm ? `${job.label} · ${job.radiusKm} km` : job.label;
  }
}
