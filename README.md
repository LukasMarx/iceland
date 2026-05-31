# IslandHub

Mobile-first walking skeleton for the IslandHub concept. The first implementation focuses on a runnable Nx monorepo with seed data, a NestJS API and an Angular mobile PWA that demonstrates the core journey:

1. Onboarding for a hub-based Iceland trip.
2. Explore map surface with shared safety status.
3. Spot details with reason, source and freshness.
4. Today timeline with manual progress.
5. Trip and Profile tabs for the planned IA.

## Apps

- `mobile`: Angular PWA demo for the traveller experience.
- `admin`: Angular placeholder for future content operations.
- `api`: NestJS seed API with health, explore, spot context, today and trip endpoints.

## Libraries

- `domain`: shared status, vehicle, trip and route types.
- `api-contracts`: DTOs shared by API and frontend.
- `map`: lightweight Iceland canvas projection for the mocked map layer.
- `i18n`: initial locale metadata and copy anchors.
- `ui`: generated Angular UI library reserved for extracted components.

## Local Development

```bash
npm run dev:api
npm run dev:mobile
```

The mobile app falls back to identical seed data if the API is not running. With the API running, it reads from `http://localhost:3000/api`.

## Authentication

The API now supports both email/password auth and social login token exchange:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/social` with `provider = google | apple`

Protected trip/profile endpoints require a Bearer token in `Authorization`.

Set these environment variables for non-demo auth flows:

- `JWT_SECRET` for signed access tokens
- `GOOGLE_CLIENT_ID` for Google ID token verification
- `APPLE_CLIENT_ID` for Apple ID token verification

For the mobile web client, also configure the matching front-end values in [apps/mobile/src/environments/environment.ts](apps/mobile/src/environments/environment.ts) and [apps/mobile/src/environments/environment.prod.ts](apps/mobile/src/environments/environment.prod.ts):

- `googleClientId`
- `appleClientId`
- `appleRedirectUri`

## Verification

```bash
npm run test
npm run build
```

The current seed mode is intentionally transparent: official Vedur.is and Vegagerdin integrations are modeled in the response shape, but not yet polled live.