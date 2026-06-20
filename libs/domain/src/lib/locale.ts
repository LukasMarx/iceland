import { Injectable, signal } from '@angular/core';

export type LocaleCode = 'en' | 'de' | 'is';

export const localeNames: Record<LocaleCode, string> = {
  en: 'English',
  de: 'Deutsch',
  is: 'Islenska',
};

export const appCopy = {
  promise: 'See what is open today.',
  safetyLine: 'Safety status always includes reason, source and freshness.',
};

const translations = {
  en: {
    'route.createdForSpot': 'Route to {spot} created.',
    'route.spotAdded': '{spot} added to "{route}".',
    'route.updated': 'Route updated.',
    'route.started': '{route} started. Today is ready.',
    'route.startedLocally': '{route} started locally. Today is ready.',
    'route.draftReadyToday': 'Route draft is ready as today\'s route.',
    'route.draftSavedToTrip': 'Route draft saved to your trip.',
    'route.editorComingSoon': 'Route editor will arrive in the next step.',
    'spot.savedLocally': '{spot} saved locally for this session.',
    'trip.spotAddedToDraft': '{spot} added to a draft day.',
  },
} as const;

export type TranslationKey = keyof typeof translations.en;

@Injectable({ providedIn: 'root' })
export class I18nService {
  readonly locale = signal<LocaleCode>('en');

  t(key: TranslationKey, params: Record<string, string | number> = {}): string {
    const template: string = translations.en[key];

    return Object.entries(params).reduce(
      (message, [name, value]) => message.replaceAll(`{${name}}`, String(value)),
      template,
    );
  }
}
