-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "postgis";

-- CreateEnum
CREATE TYPE "Locale" AS ENUM ('en', 'de', 'is');

-- CreateEnum
CREATE TYPE "UnitSystem" AS ENUM ('metric', 'imperial');

-- CreateEnum
CREATE TYPE "TemperatureUnit" AS ENUM ('C', 'F');

-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('EUR', 'ISK', 'USD', 'GBP');

-- CreateEnum
CREATE TYPE "PlanningPhase" AS ENUM ('ideas', 'fixed_hub', 'roadtrip');

-- CreateEnum
CREATE TYPE "VehicleProfile" AS ENUM ('car_2wd', 'car_4wd', 'unknown');

-- CreateEnum
CREATE TYPE "SafetyLevel" AS ENUM ('green', 'yellow', 'red', 'unknown');

-- CreateEnum
CREATE TYPE "RouteDirection" AS ENUM ('ONE_WAY', 'LOOP');

-- CreateEnum
CREATE TYPE "PlaceType" AS ENUM ('city', 'hotel', 'home', 'airport', 'hub', 'custom');

-- CreateEnum
CREATE TYPE "PlaceSource" AS ENUM ('database', 'osm', 'user_location', 'seed', 'affiliate');

-- CreateEnum
CREATE TYPE "TripMemberRole" AS ENUM ('owner', 'editor', 'viewer');

-- CreateEnum
CREATE TYPE "TripDayStatus" AS ENUM ('empty', 'draft', 'planned', 'active', 'done');

-- CreateEnum
CREATE TYPE "RouteLifecycle" AS ENUM ('draft', 'planned', 'active_today', 'done', 'archived');

-- CreateEnum
CREATE TYPE "RouteSource" AS ENUM ('wizard', 'spot_action', 'manual', 'suggestion', 'draft_day');

-- CreateEnum
CREATE TYPE "RouteStopState" AS ENUM ('pending', 'active', 'done', 'skipped');

-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('image', 'video');

-- CreateEnum
CREATE TYPE "SourceType" AS ENUM ('road', 'weather', 'safetravel', 'operator', 'manual', 'unknown');

-- CreateEnum
CREATE TYPE "StatusEntityType" AS ENUM ('spot', 'route', 'road_segment');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('pending', 'accepted', 'rejected', 'archived');

-- CreateEnum
CREATE TYPE "ReportType" AS ENUM ('road_issue', 'weather_issue', 'closure', 'crowding', 'media_update', 'spot_info', 'other');

-- CreateEnum
CREATE TYPE "OfflineCacheMode" AS ENUM ('map_area', 'today_route', 'trip_core');

-- CreateEnum
CREATE TYPE "OfflineCacheJobState" AS ENUM ('queued', 'running', 'completed', 'failed');

-- CreateEnum
CREATE TYPE "EntitlementSource" AS ENUM ('free', 'purchase', 'admin', 'trial', 'trip_owner');

-- CreateEnum
CREATE TYPE "PurchaseProvider" AS ENUM ('apple', 'google', 'stripe', 'admin');

-- CreateEnum
CREATE TYPE "SubscriptionPlan" AS ENUM ('free', 'premium', 'trial');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('push', 'email', 'in_app');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('create', 'update', 'delete', 'calculate', 'override', 'unsafe_confirm', 'ingest', 'login');

-- CreateEnum
CREATE TYPE "TripPace" AS ENUM ('slow', 'moderate', 'fast');

-- CreateEnum
CREATE TYPE "BookingState" AS ENUM ('unknown', 'available', 'on_request', 'sold_out');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT,
    "displayName" TEXT NOT NULL,
    "initials" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "subscription" "SubscriptionPlan" NOT NULL DEFAULT 'free',
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_identities" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "provider" TEXT NOT NULL,
    "providerUserId" TEXT NOT NULL,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auth_identities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_preferences" (
    "userId" UUID NOT NULL,
    "locale" "Locale" NOT NULL DEFAULT 'en',
    "units" "UnitSystem" NOT NULL DEFAULT 'metric',
    "temperatureUnit" "TemperatureUnit" NOT NULL DEFAULT 'C',
    "currency" "Currency" NOT NULL DEFAULT 'EUR',
    "pushAlertsTomorrowRoute" BOOLEAN NOT NULL DEFAULT true,
    "notifyStatusWorsensEnRoute" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "emergency_contacts" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "emergency_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trips" (
    "id" UUID NOT NULL,
    "ownerId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "planningPhase" "PlanningPhase" NOT NULL DEFAULT 'fixed_hub',
    "startsOn" DATE NOT NULL,
    "endsOn" DATE NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Atlantic/Reykjavik',
    "vehicle" "VehicleProfile" NOT NULL DEFAULT 'unknown',
    "pace" "TripPace",
    "activeHubId" UUID,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "trips_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trip_members" (
    "id" UUID NOT NULL,
    "tripId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "role" "TripMemberRole" NOT NULL DEFAULT 'viewer',
    "invitedBy" UUID,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trip_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trip_days" (
    "id" UUID NOT NULL,
    "tripId" UUID NOT NULL,
    "date" DATE NOT NULL,
    "title" TEXT,
    "status" "TripDayStatus" NOT NULL DEFAULT 'empty',
    "notes" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trip_days_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hubs" (
    "id" UUID NOT NULL,
    "tripId" UUID NOT NULL,
    "placeId" TEXT,
    "name" TEXT NOT NULL,
    "type" "PlaceType" NOT NULL DEFAULT 'hub',
    "startsOn" DATE,
    "endsOn" DATE,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "lat" DOUBLE PRECISION NOT NULL,
    "lon" DOUBLE PRECISION NOT NULL,
    "location" geography(Point, 4326),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hubs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "places" (
    "id" TEXT NOT NULL,
    "source" "PlaceSource" NOT NULL DEFAULT 'database',
    "sourceId" TEXT,
    "type" "PlaceType" NOT NULL,
    "name" TEXT NOT NULL,
    "region" TEXT,
    "countryCode" TEXT NOT NULL DEFAULT 'IS',
    "lat" DOUBLE PRECISION NOT NULL,
    "lon" DOUBLE PRECISION NOT NULL,
    "location" geography(Point, 4326),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "places_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hotel_profiles" (
    "placeId" TEXT NOT NULL,
    "stars" INTEGER,
    "bookingState" "BookingState" NOT NULL DEFAULT 'unknown',
    "affiliatePartnerId" UUID,
    "bookingUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hotel_profiles_pkey" PRIMARY KEY ("placeId")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "parentId" TEXT,
    "icon" TEXT,
    "defaultLocale" "Locale" NOT NULL DEFAULT 'en',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "category_translations" (
    "id" UUID NOT NULL,
    "categoryId" TEXT NOT NULL,
    "locale" "Locale" NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "category_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "spots" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "region" TEXT,
    "defaultLocale" "Locale" NOT NULL DEFAULT 'en',
    "visitMinutes" INTEGER NOT NULL DEFAULT 30,
    "minVehicle" "VehicleProfile" NOT NULL DEFAULT 'car_2wd',
    "isFRoad" BOOLEAN NOT NULL DEFAULT false,
    "popularityScore" INTEGER NOT NULL DEFAULT 0,
    "manualRank" INTEGER NOT NULL DEFAULT 0,
    "lat" DOUBLE PRECISION NOT NULL,
    "lon" DOUBLE PRECISION NOT NULL,
    "location" geography(Point, 4326),
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "spots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "spot_translations" (
    "id" UUID NOT NULL,
    "spotId" TEXT NOT NULL,
    "locale" "Locale" NOT NULL,
    "name" TEXT NOT NULL,
    "shortDescription" TEXT,
    "longDescription" TEXT,
    "safetyNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "spot_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "spot_categories" (
    "spotId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "spot_categories_pkey" PRIMARY KEY ("spotId","categoryId")
);

-- CreateTable
CREATE TABLE "media_assets" (
    "id" UUID NOT NULL,
    "type" "MediaType" NOT NULL,
    "url" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "alt" TEXT NOT NULL,
    "credit" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "spotId" TEXT,
    "placeId" TEXT,
    "offerId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "media_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saved_spots" (
    "id" UUID NOT NULL,
    "tripId" UUID NOT NULL,
    "spotId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saved_spots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "routes" (
    "id" UUID NOT NULL,
    "tripId" UUID NOT NULL,
    "tripDayId" UUID,
    "title" TEXT NOT NULL,
    "date" DATE,
    "lifecycle" "RouteLifecycle" NOT NULL DEFAULT 'planned',
    "direction" "RouteDirection" NOT NULL,
    "source" "RouteSource" NOT NULL DEFAULT 'manual',
    "startPlaceId" TEXT,
    "startName" TEXT NOT NULL,
    "startType" "PlaceType" NOT NULL DEFAULT 'custom',
    "startLat" DOUBLE PRECISION NOT NULL,
    "startLon" DOUBLE PRECISION NOT NULL,
    "startLocation" geography(Point, 4326),
    "destinationPlaceId" TEXT,
    "destinationName" TEXT,
    "destinationType" "PlaceType",
    "destinationLat" DOUBLE PRECISION,
    "destinationLon" DOUBLE PRECISION,
    "destinationLocation" geography(Point, 4326),
    "totalDriveMinutes" INTEGER NOT NULL DEFAULT 0,
    "totalTripMinutes" INTEGER NOT NULL DEFAULT 0,
    "distanceKm" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "highestStatus" "SafetyLevel" NOT NULL DEFAULT 'unknown',
    "statusReason" TEXT,
    "activeKey" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "routes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "route_stops" (
    "id" UUID NOT NULL,
    "routeId" UUID NOT NULL,
    "spotId" TEXT,
    "placeId" TEXT,
    "position" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lon" DOUBLE PRECISION NOT NULL,
    "location" geography(Point, 4326),
    "state" "RouteStopState" NOT NULL DEFAULT 'pending',
    "arriveAt" TIMESTAMP(3),
    "departAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "visitMinutes" INTEGER NOT NULL DEFAULT 0,
    "driveMinutesFromPrevious" INTEGER,
    "distanceKmFromPrevious" DOUBLE PRECISION,
    "statusSnapshotId" UUID,
    "statusLevel" "SafetyLevel" NOT NULL DEFAULT 'unknown',
    "statusReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "route_stops_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "route_suggestion_cache" (
    "suggestionId" TEXT NOT NULL,
    "tripId" UUID NOT NULL,
    "date" DATE NOT NULL,
    "vehicle" "VehicleProfile" NOT NULL,
    "payload" JSONB NOT NULL,
    "reason" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "route_suggestion_cache_pkey" PRIMARY KEY ("suggestionId")
);

-- CreateTable
CREATE TABLE "spot_status_snapshots" (
    "id" UUID NOT NULL,
    "spotId" TEXT NOT NULL,
    "tripId" UUID,
    "hubId" UUID,
    "vehicle" "VehicleProfile" NOT NULL DEFAULT 'unknown',
    "targetDate" DATE,
    "level" "SafetyLevel" NOT NULL,
    "label" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "reasons" JSONB,
    "roadStatus" JSONB,
    "weatherStatus" JSONB,
    "vehicleStatus" JSONB,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validUntil" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "spot_status_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "route_status_snapshots" (
    "id" UUID NOT NULL,
    "routeId" UUID NOT NULL,
    "tripId" UUID,
    "hubId" UUID,
    "vehicle" "VehicleProfile" NOT NULL DEFAULT 'unknown',
    "targetDate" DATE,
    "level" "SafetyLevel" NOT NULL,
    "label" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "reasons" JSONB,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validUntil" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "route_status_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "status_source_timestamps" (
    "id" UUID NOT NULL,
    "spotStatusSnapshotId" UUID,
    "routeStatusSnapshotId" UUID,
    "source" "SourceType" NOT NULL,
    "label" TEXT NOT NULL,
    "checkedAt" TIMESTAMP(3) NOT NULL,
    "validUntil" TIMESTAMP(3),
    "url" TEXT,
    "metadata" JSONB,

    CONSTRAINT "status_source_timestamps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "status_audits" (
    "id" UUID NOT NULL,
    "entityType" "StatusEntityType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "tripId" UUID,
    "hubId" UUID,
    "vehicle" "VehicleProfile",
    "evaluatedAt" TIMESTAMP(3),
    "sourceSnapshotIds" TEXT[],
    "ruleVersions" TEXT[],
    "resultingStatus" "SafetyLevel" NOT NULL,
    "reasons" JSONB,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "status_audits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "official_road_segments" (
    "id" TEXT NOT NULL,
    "sourceSegmentId" TEXT NOT NULL,
    "roadNumber" TEXT,
    "name" TEXT,
    "isFRoad" BOOLEAN NOT NULL DEFAULT false,
    "surfaceType" TEXT,
    "centerLat" DOUBLE PRECISION,
    "centerLon" DOUBLE PRECISION,
    "geometry" geometry(MultiLineString, 4326),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "official_road_segments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "spot_road_segments" (
    "spotId" TEXT NOT NULL,
    "roadSegmentId" TEXT NOT NULL,
    "relevance" INTEGER NOT NULL DEFAULT 100,

    CONSTRAINT "spot_road_segments_pkey" PRIMARY KEY ("spotId","roadSegmentId")
);

-- CreateTable
CREATE TABLE "official_road_condition_snapshots" (
    "id" UUID NOT NULL,
    "roadSegmentId" TEXT NOT NULL,
    "sourceSegmentId" TEXT NOT NULL,
    "surfaceState" TEXT,
    "additionalInfo" TEXT,
    "isClosed" BOOLEAN NOT NULL DEFAULT false,
    "weightLimit" TEXT,
    "raw" JSONB,
    "sourceUpdatedAt" TIMESTAMP(3) NOT NULL,
    "ingestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validUntil" TIMESTAMP(3),

    CONSTRAINT "official_road_condition_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "official_weather_stations" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "region" TEXT,
    "lat" DOUBLE PRECISION NOT NULL,
    "lon" DOUBLE PRECISION NOT NULL,
    "location" geography(Point, 4326),
    "elevationM" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "official_weather_stations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "official_weather_snapshots" (
    "id" UUID NOT NULL,
    "stationId" TEXT NOT NULL,
    "observedAt" TIMESTAMP(3) NOT NULL,
    "forecastFor" TIMESTAMP(3),
    "temperatureC" DOUBLE PRECISION,
    "windSpeedMs" DOUBLE PRECISION,
    "windGustMs" DOUBLE PRECISION,
    "precipitationMm" DOUBLE PRECISION,
    "visibilityM" INTEGER,
    "snowOrIce" BOOLEAN,
    "raw" JSONB,
    "ingestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validUntil" TIMESTAMP(3),

    CONSTRAINT "official_weather_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "routing_leg_cache" (
    "id" UUID NOT NULL,
    "cacheKey" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'valhalla',
    "vehicle" "VehicleProfile" NOT NULL,
    "originKind" TEXT NOT NULL,
    "originRefId" TEXT,
    "originLat" DOUBLE PRECISION NOT NULL,
    "originLon" DOUBLE PRECISION NOT NULL,
    "originLocation" geography(Point, 4326),
    "destinationKind" TEXT NOT NULL,
    "destinationRefId" TEXT,
    "destinationLat" DOUBLE PRECISION NOT NULL,
    "destinationLon" DOUBLE PRECISION NOT NULL,
    "destinationLocation" geography(Point, 4326),
    "distanceKm" DOUBLE PRECISION NOT NULL,
    "driveMinutes" INTEGER NOT NULL,
    "routeGeometry" geometry(LineString, 4326),
    "warnings" JSONB,
    "sourceUpdatedAt" TIMESTAMP(3),
    "validUntil" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "routing_leg_cache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "isochrone_cache" (
    "id" UUID NOT NULL,
    "cacheKey" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'valhalla',
    "vehicle" "VehicleProfile" NOT NULL,
    "centerLat" DOUBLE PRECISION NOT NULL,
    "centerLon" DOUBLE PRECISION NOT NULL,
    "centerLocation" geography(Point, 4326),
    "minutes" INTEGER NOT NULL,
    "polygon" geometry(MultiPolygon, 4326),
    "validUntil" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "isochrone_cache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_reports" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "spotId" TEXT,
    "type" "ReportType" NOT NULL,
    "status" "ReportStatus" NOT NULL DEFAULT 'pending',
    "title" TEXT NOT NULL,
    "body" TEXT,
    "lat" DOUBLE PRECISION,
    "lon" DOUBLE PRECISION,
    "location" geography(Point, 4326),
    "reviewedBy" UUID,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "community_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feature_flags" (
    "key" TEXT NOT NULL,
    "description" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "rolloutGroup" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feature_flags_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "entitlements" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "featureKey" TEXT NOT NULL,
    "source" "EntitlementSource" NOT NULL,
    "validFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "entitlements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchases" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "provider" "PurchaseProvider" NOT NULL,
    "providerTransactionId" TEXT NOT NULL,
    "productKey" TEXT NOT NULL,
    "amountCents" INTEGER,
    "currency" "Currency",
    "purchasedAt" TIMESTAMP(3) NOT NULL,
    "validUntil" TIMESTAMP(3),
    "raw" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "affiliate_partners" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "websiteUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "affiliate_partners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "affiliate_offers" (
    "id" UUID NOT NULL,
    "partnerId" UUID NOT NULL,
    "spotId" TEXT,
    "categoryId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "targetUrl" TEXT NOT NULL,
    "disclosureLabel" TEXT NOT NULL,
    "rank" INTEGER NOT NULL DEFAULT 0,
    "validFrom" TIMESTAMP(3),
    "validUntil" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "affiliate_offers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "affiliate_clicks" (
    "id" UUID NOT NULL,
    "userId" UUID,
    "partnerId" UUID NOT NULL,
    "offerId" UUID,
    "tripId" UUID,
    "context" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "affiliate_clicks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "push_tokens" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL DEFAULT 'push',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastSeenAt" TIMESTAMP(3),

    CONSTRAINT "push_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offline_cache_jobs" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "tripId" UUID,
    "mode" "OfflineCacheMode" NOT NULL,
    "state" "OfflineCacheJobState" NOT NULL DEFAULT 'queued',
    "progressPercent" INTEGER NOT NULL DEFAULT 0,
    "label" TEXT NOT NULL,
    "centerLat" DOUBLE PRECISION,
    "centerLon" DOUBLE PRECISION,
    "radiusKm" DOUBLE PRECISION,
    "includes" TEXT[],
    "estimatedBytes" BIGINT,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "offline_cache_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "idempotency_keys" (
    "id" UUID NOT NULL,
    "userId" UUID,
    "key" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "response" JSONB,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "idempotency_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_events" (
    "id" UUID NOT NULL,
    "userId" UUID,
    "action" "AuditAction" NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "requestId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "official_raw_ingests" (
    "id" UUID NOT NULL,
    "source" "SourceType" NOT NULL,
    "sourceKey" TEXT NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "payload" JSONB NOT NULL,
    "contentHash" TEXT NOT NULL,

    CONSTRAINT "official_raw_ingests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DemoState" (
    "id" TEXT NOT NULL,
    "savedSpotIdsJson" TEXT NOT NULL,
    "todayTitle" TEXT NOT NULL,
    "todayStopProgress" TEXT NOT NULL,
    "todayDriveMinutes" INTEGER NOT NULL,
    "todayUpdate" TEXT NOT NULL,
    "routeStopsJson" TEXT NOT NULL,
    "tripJson" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DemoState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_subscription_idx" ON "users"("subscription");

-- CreateIndex
CREATE INDEX "users_deletedAt_idx" ON "users"("deletedAt");

-- CreateIndex
CREATE INDEX "auth_identities_email_idx" ON "auth_identities"("email");

-- CreateIndex
CREATE UNIQUE INDEX "auth_identities_provider_providerUserId_key" ON "auth_identities"("provider", "providerUserId");

-- CreateIndex
CREATE UNIQUE INDEX "auth_identities_userId_provider_key" ON "auth_identities"("userId", "provider");

-- CreateIndex
CREATE INDEX "emergency_contacts_userId_sortOrder_idx" ON "emergency_contacts"("userId", "sortOrder");

-- CreateIndex
CREATE INDEX "trips_ownerId_isActive_idx" ON "trips"("ownerId", "isActive");

-- CreateIndex
CREATE INDEX "trips_startsOn_endsOn_idx" ON "trips"("startsOn", "endsOn");

-- CreateIndex
CREATE INDEX "trip_members_userId_role_idx" ON "trip_members"("userId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "trip_members_tripId_userId_key" ON "trip_members"("tripId", "userId");

-- CreateIndex
CREATE INDEX "trip_days_tripId_status_idx" ON "trip_days"("tripId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "trip_days_tripId_date_key" ON "trip_days"("tripId", "date");

-- CreateIndex
CREATE INDEX "hubs_tripId_sortOrder_idx" ON "hubs"("tripId", "sortOrder");

-- CreateIndex
CREATE INDEX "hubs_location_idx" ON "hubs" USING GIST ("location");

-- CreateIndex
CREATE INDEX "places_type_region_idx" ON "places"("type", "region");

-- CreateIndex
CREATE INDEX "places_location_idx" ON "places" USING GIST ("location");

-- CreateIndex
CREATE UNIQUE INDEX "places_source_sourceId_key" ON "places"("source", "sourceId");

-- CreateIndex
CREATE INDEX "hotel_profiles_bookingState_idx" ON "hotel_profiles"("bookingState");

-- CreateIndex
CREATE INDEX "categories_parentId_sortOrder_idx" ON "categories"("parentId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "category_translations_categoryId_locale_key" ON "category_translations"("categoryId", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "spots_slug_key" ON "spots"("slug");

-- CreateIndex
CREATE INDEX "spots_isPublished_manualRank_idx" ON "spots"("isPublished", "manualRank");

-- CreateIndex
CREATE INDEX "spots_region_idx" ON "spots"("region");

-- CreateIndex
CREATE INDEX "spots_minVehicle_isFRoad_idx" ON "spots"("minVehicle", "isFRoad");

-- CreateIndex
CREATE INDEX "spots_location_idx" ON "spots" USING GIST ("location");

-- CreateIndex
CREATE INDEX "spot_translations_locale_name_idx" ON "spot_translations"("locale", "name");

-- CreateIndex
CREATE UNIQUE INDEX "spot_translations_spotId_locale_key" ON "spot_translations"("spotId", "locale");

-- CreateIndex
CREATE INDEX "spot_categories_categoryId_sortOrder_idx" ON "spot_categories"("categoryId", "sortOrder");

-- CreateIndex
CREATE INDEX "media_assets_spotId_sortOrder_idx" ON "media_assets"("spotId", "sortOrder");

-- CreateIndex
CREATE INDEX "media_assets_placeId_sortOrder_idx" ON "media_assets"("placeId", "sortOrder");

-- CreateIndex
CREATE INDEX "media_assets_offerId_sortOrder_idx" ON "media_assets"("offerId", "sortOrder");

-- CreateIndex
CREATE INDEX "saved_spots_tripId_sortOrder_idx" ON "saved_spots"("tripId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "saved_spots_tripId_spotId_key" ON "saved_spots"("tripId", "spotId");

-- CreateIndex
CREATE UNIQUE INDEX "routes_activeKey_key" ON "routes"("activeKey");

-- CreateIndex
CREATE INDEX "routes_tripId_lifecycle_date_idx" ON "routes"("tripId", "lifecycle", "date");

-- CreateIndex
CREATE INDEX "routes_tripDayId_idx" ON "routes"("tripDayId");

-- CreateIndex
CREATE INDEX "routes_highestStatus_idx" ON "routes"("highestStatus");

-- CreateIndex
CREATE INDEX "routes_startLocation_idx" ON "routes" USING GIST ("startLocation");

-- CreateIndex
CREATE INDEX "routes_destinationLocation_idx" ON "routes" USING GIST ("destinationLocation");

-- CreateIndex
CREATE INDEX "route_stops_routeId_state_idx" ON "route_stops"("routeId", "state");

-- CreateIndex
CREATE INDEX "route_stops_spotId_idx" ON "route_stops"("spotId");

-- CreateIndex
CREATE INDEX "route_stops_location_idx" ON "route_stops" USING GIST ("location");

-- CreateIndex
CREATE UNIQUE INDEX "route_stops_routeId_position_key" ON "route_stops"("routeId", "position");

-- CreateIndex
CREATE INDEX "route_suggestion_cache_tripId_date_expiresAt_idx" ON "route_suggestion_cache"("tripId", "date", "expiresAt");

-- CreateIndex
CREATE INDEX "spot_status_snapshots_spotId_tripId_hubId_vehicle_targetDat_idx" ON "spot_status_snapshots"("spotId", "tripId", "hubId", "vehicle", "targetDate", "calculatedAt");

-- CreateIndex
CREATE INDEX "spot_status_snapshots_level_validUntil_idx" ON "spot_status_snapshots"("level", "validUntil");

-- CreateIndex
CREATE INDEX "route_status_snapshots_routeId_vehicle_targetDate_calculate_idx" ON "route_status_snapshots"("routeId", "vehicle", "targetDate", "calculatedAt");

-- CreateIndex
CREATE INDEX "route_status_snapshots_tripId_level_validUntil_idx" ON "route_status_snapshots"("tripId", "level", "validUntil");

-- CreateIndex
CREATE INDEX "status_source_timestamps_source_checkedAt_idx" ON "status_source_timestamps"("source", "checkedAt");

-- CreateIndex
CREATE INDEX "status_source_timestamps_spotStatusSnapshotId_idx" ON "status_source_timestamps"("spotStatusSnapshotId");

-- CreateIndex
CREATE INDEX "status_source_timestamps_routeStatusSnapshotId_idx" ON "status_source_timestamps"("routeStatusSnapshotId");

-- CreateIndex
CREATE INDEX "status_audits_entityType_entityId_calculatedAt_idx" ON "status_audits"("entityType", "entityId", "calculatedAt");

-- CreateIndex
CREATE INDEX "status_audits_tripId_calculatedAt_idx" ON "status_audits"("tripId", "calculatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "official_road_segments_sourceSegmentId_key" ON "official_road_segments"("sourceSegmentId");

-- CreateIndex
CREATE INDEX "official_road_segments_roadNumber_idx" ON "official_road_segments"("roadNumber");

-- CreateIndex
CREATE INDEX "official_road_segments_isFRoad_idx" ON "official_road_segments"("isFRoad");

-- CreateIndex
CREATE INDEX "official_road_segments_geometry_idx" ON "official_road_segments" USING GIST ("geometry");

-- CreateIndex
CREATE INDEX "spot_road_segments_roadSegmentId_idx" ON "spot_road_segments"("roadSegmentId");

-- CreateIndex
CREATE INDEX "official_road_condition_snapshots_roadSegmentId_sourceUpdat_idx" ON "official_road_condition_snapshots"("roadSegmentId", "sourceUpdatedAt");

-- CreateIndex
CREATE INDEX "official_road_condition_snapshots_isClosed_validUntil_idx" ON "official_road_condition_snapshots"("isClosed", "validUntil");

-- CreateIndex
CREATE UNIQUE INDEX "official_weather_stations_sourceId_key" ON "official_weather_stations"("sourceId");

-- CreateIndex
CREATE INDEX "official_weather_stations_region_idx" ON "official_weather_stations"("region");

-- CreateIndex
CREATE INDEX "official_weather_stations_location_idx" ON "official_weather_stations" USING GIST ("location");

-- CreateIndex
CREATE INDEX "official_weather_snapshots_stationId_observedAt_idx" ON "official_weather_snapshots"("stationId", "observedAt");

-- CreateIndex
CREATE INDEX "official_weather_snapshots_forecastFor_idx" ON "official_weather_snapshots"("forecastFor");

-- CreateIndex
CREATE UNIQUE INDEX "routing_leg_cache_cacheKey_key" ON "routing_leg_cache"("cacheKey");

-- CreateIndex
CREATE INDEX "routing_leg_cache_vehicle_validUntil_idx" ON "routing_leg_cache"("vehicle", "validUntil");

-- CreateIndex
CREATE INDEX "routing_leg_cache_originRefId_destinationRefId_vehicle_idx" ON "routing_leg_cache"("originRefId", "destinationRefId", "vehicle");

-- CreateIndex
CREATE INDEX "routing_leg_cache_originLocation_idx" ON "routing_leg_cache" USING GIST ("originLocation");

-- CreateIndex
CREATE INDEX "routing_leg_cache_destinationLocation_idx" ON "routing_leg_cache" USING GIST ("destinationLocation");

-- CreateIndex
CREATE INDEX "routing_leg_cache_routeGeometry_idx" ON "routing_leg_cache" USING GIST ("routeGeometry");

-- CreateIndex
CREATE UNIQUE INDEX "isochrone_cache_cacheKey_key" ON "isochrone_cache"("cacheKey");

-- CreateIndex
CREATE INDEX "isochrone_cache_vehicle_minutes_validUntil_idx" ON "isochrone_cache"("vehicle", "minutes", "validUntil");

-- CreateIndex
CREATE INDEX "isochrone_cache_centerLocation_idx" ON "isochrone_cache" USING GIST ("centerLocation");

-- CreateIndex
CREATE INDEX "isochrone_cache_polygon_idx" ON "isochrone_cache" USING GIST ("polygon");

-- CreateIndex
CREATE INDEX "community_reports_status_createdAt_idx" ON "community_reports"("status", "createdAt");

-- CreateIndex
CREATE INDEX "community_reports_spotId_status_idx" ON "community_reports"("spotId", "status");

-- CreateIndex
CREATE INDEX "community_reports_location_idx" ON "community_reports" USING GIST ("location");

-- CreateIndex
CREATE INDEX "feature_flags_enabled_rolloutGroup_idx" ON "feature_flags"("enabled", "rolloutGroup");

-- CreateIndex
CREATE INDEX "entitlements_featureKey_validUntil_idx" ON "entitlements"("featureKey", "validUntil");

-- CreateIndex
CREATE UNIQUE INDEX "entitlements_userId_featureKey_source_key" ON "entitlements"("userId", "featureKey", "source");

-- CreateIndex
CREATE UNIQUE INDEX "purchases_providerTransactionId_key" ON "purchases"("providerTransactionId");

-- CreateIndex
CREATE INDEX "purchases_userId_purchasedAt_idx" ON "purchases"("userId", "purchasedAt");

-- CreateIndex
CREATE UNIQUE INDEX "affiliate_partners_key_key" ON "affiliate_partners"("key");

-- CreateIndex
CREATE INDEX "affiliate_partners_isActive_idx" ON "affiliate_partners"("isActive");

-- CreateIndex
CREATE INDEX "affiliate_offers_partnerId_isActive_idx" ON "affiliate_offers"("partnerId", "isActive");

-- CreateIndex
CREATE INDEX "affiliate_offers_spotId_rank_idx" ON "affiliate_offers"("spotId", "rank");

-- CreateIndex
CREATE INDEX "affiliate_clicks_partnerId_createdAt_idx" ON "affiliate_clicks"("partnerId", "createdAt");

-- CreateIndex
CREATE INDEX "affiliate_clicks_userId_createdAt_idx" ON "affiliate_clicks"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "push_tokens_token_key" ON "push_tokens"("token");

-- CreateIndex
CREATE INDEX "push_tokens_userId_enabled_idx" ON "push_tokens"("userId", "enabled");

-- CreateIndex
CREATE INDEX "offline_cache_jobs_userId_state_createdAt_idx" ON "offline_cache_jobs"("userId", "state", "createdAt");

-- CreateIndex
CREATE INDEX "offline_cache_jobs_tripId_mode_idx" ON "offline_cache_jobs"("tripId", "mode");

-- CreateIndex
CREATE INDEX "idempotency_keys_expiresAt_idx" ON "idempotency_keys"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "idempotency_keys_userId_scope_key_key" ON "idempotency_keys"("userId", "scope", "key");

-- CreateIndex
CREATE INDEX "audit_events_entityType_entityId_createdAt_idx" ON "audit_events"("entityType", "entityId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_events_userId_createdAt_idx" ON "audit_events"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "official_raw_ingests_source_sourceKey_fetchedAt_idx" ON "official_raw_ingests"("source", "sourceKey", "fetchedAt");

-- CreateIndex
CREATE INDEX "official_raw_ingests_expiresAt_idx" ON "official_raw_ingests"("expiresAt");

-- AddForeignKey
ALTER TABLE "auth_identities" ADD CONSTRAINT "auth_identities_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emergency_contacts" ADD CONSTRAINT "emergency_contacts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_activeHubId_fkey" FOREIGN KEY ("activeHubId") REFERENCES "hubs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_members" ADD CONSTRAINT "trip_members_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_members" ADD CONSTRAINT "trip_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_members" ADD CONSTRAINT "trip_members_invitedBy_fkey" FOREIGN KEY ("invitedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_days" ADD CONSTRAINT "trip_days_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hubs" ADD CONSTRAINT "hubs_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hubs" ADD CONSTRAINT "hubs_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "places"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hotel_profiles" ADD CONSTRAINT "hotel_profiles_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "places"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hotel_profiles" ADD CONSTRAINT "hotel_profiles_affiliatePartnerId_fkey" FOREIGN KEY ("affiliatePartnerId") REFERENCES "affiliate_partners"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "category_translations" ADD CONSTRAINT "category_translations_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "spot_translations" ADD CONSTRAINT "spot_translations_spotId_fkey" FOREIGN KEY ("spotId") REFERENCES "spots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "spot_categories" ADD CONSTRAINT "spot_categories_spotId_fkey" FOREIGN KEY ("spotId") REFERENCES "spots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "spot_categories" ADD CONSTRAINT "spot_categories_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_spotId_fkey" FOREIGN KEY ("spotId") REFERENCES "spots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "places"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "affiliate_offers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_spots" ADD CONSTRAINT "saved_spots_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_spots" ADD CONSTRAINT "saved_spots_spotId_fkey" FOREIGN KEY ("spotId") REFERENCES "spots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routes" ADD CONSTRAINT "routes_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routes" ADD CONSTRAINT "routes_tripDayId_fkey" FOREIGN KEY ("tripDayId") REFERENCES "trip_days"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routes" ADD CONSTRAINT "routes_startPlaceId_fkey" FOREIGN KEY ("startPlaceId") REFERENCES "places"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routes" ADD CONSTRAINT "routes_destinationPlaceId_fkey" FOREIGN KEY ("destinationPlaceId") REFERENCES "places"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "route_stops" ADD CONSTRAINT "route_stops_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "routes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "route_stops" ADD CONSTRAINT "route_stops_spotId_fkey" FOREIGN KEY ("spotId") REFERENCES "spots"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "route_stops" ADD CONSTRAINT "route_stops_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "places"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "route_stops" ADD CONSTRAINT "route_stops_statusSnapshotId_fkey" FOREIGN KEY ("statusSnapshotId") REFERENCES "spot_status_snapshots"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "route_suggestion_cache" ADD CONSTRAINT "route_suggestion_cache_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "spot_status_snapshots" ADD CONSTRAINT "spot_status_snapshots_spotId_fkey" FOREIGN KEY ("spotId") REFERENCES "spots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "spot_status_snapshots" ADD CONSTRAINT "spot_status_snapshots_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "spot_status_snapshots" ADD CONSTRAINT "spot_status_snapshots_hubId_fkey" FOREIGN KEY ("hubId") REFERENCES "hubs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "route_status_snapshots" ADD CONSTRAINT "route_status_snapshots_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "routes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "route_status_snapshots" ADD CONSTRAINT "route_status_snapshots_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "route_status_snapshots" ADD CONSTRAINT "route_status_snapshots_hubId_fkey" FOREIGN KEY ("hubId") REFERENCES "hubs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "status_source_timestamps" ADD CONSTRAINT "status_source_timestamps_spotStatusSnapshotId_fkey" FOREIGN KEY ("spotStatusSnapshotId") REFERENCES "spot_status_snapshots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "status_source_timestamps" ADD CONSTRAINT "status_source_timestamps_routeStatusSnapshotId_fkey" FOREIGN KEY ("routeStatusSnapshotId") REFERENCES "route_status_snapshots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "status_audits" ADD CONSTRAINT "status_audits_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "status_audits" ADD CONSTRAINT "status_audits_hubId_fkey" FOREIGN KEY ("hubId") REFERENCES "hubs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "spot_road_segments" ADD CONSTRAINT "spot_road_segments_spotId_fkey" FOREIGN KEY ("spotId") REFERENCES "spots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "spot_road_segments" ADD CONSTRAINT "spot_road_segments_roadSegmentId_fkey" FOREIGN KEY ("roadSegmentId") REFERENCES "official_road_segments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "official_road_condition_snapshots" ADD CONSTRAINT "official_road_condition_snapshots_roadSegmentId_fkey" FOREIGN KEY ("roadSegmentId") REFERENCES "official_road_segments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "official_weather_snapshots" ADD CONSTRAINT "official_weather_snapshots_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "official_weather_stations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_reports" ADD CONSTRAINT "community_reports_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_reports" ADD CONSTRAINT "community_reports_spotId_fkey" FOREIGN KEY ("spotId") REFERENCES "spots"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_reports" ADD CONSTRAINT "community_reports_reviewedBy_fkey" FOREIGN KEY ("reviewedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entitlements" ADD CONSTRAINT "entitlements_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entitlements" ADD CONSTRAINT "entitlements_featureKey_fkey" FOREIGN KEY ("featureKey") REFERENCES "feature_flags"("key") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliate_offers" ADD CONSTRAINT "affiliate_offers_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "affiliate_partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliate_offers" ADD CONSTRAINT "affiliate_offers_spotId_fkey" FOREIGN KEY ("spotId") REFERENCES "spots"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliate_offers" ADD CONSTRAINT "affiliate_offers_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliate_clicks" ADD CONSTRAINT "affiliate_clicks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliate_clicks" ADD CONSTRAINT "affiliate_clicks_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "affiliate_partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliate_clicks" ADD CONSTRAINT "affiliate_clicks_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "affiliate_offers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliate_clicks" ADD CONSTRAINT "affiliate_clicks_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "push_tokens" ADD CONSTRAINT "push_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offline_cache_jobs" ADD CONSTRAINT "offline_cache_jobs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offline_cache_jobs" ADD CONSTRAINT "offline_cache_jobs_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "idempotency_keys" ADD CONSTRAINT "idempotency_keys_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
