/*
  Warnings:

  - You are about to drop the `routing_leg_cache` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "public"."routing_leg_cache";

-- CreateTable
CREATE TABLE "driving_path_cache" (
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

    CONSTRAINT "driving_path_cache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "driving_path_cache_cacheKey_key" ON "driving_path_cache"("cacheKey");

-- CreateIndex
CREATE INDEX "driving_path_cache_vehicle_validUntil_idx" ON "driving_path_cache"("vehicle", "validUntil");

-- CreateIndex
CREATE INDEX "driving_path_cache_originRefId_destinationRefId_vehicle_idx" ON "driving_path_cache"("originRefId", "destinationRefId", "vehicle");

-- CreateIndex
CREATE INDEX "driving_path_cache_originLocation_idx" ON "driving_path_cache" USING GIST ("originLocation");

-- CreateIndex
CREATE INDEX "driving_path_cache_destinationLocation_idx" ON "driving_path_cache" USING GIST ("destinationLocation");

-- CreateIndex
CREATE INDEX "driving_path_cache_routeGeometry_idx" ON "driving_path_cache" USING GIST ("routeGeometry");
