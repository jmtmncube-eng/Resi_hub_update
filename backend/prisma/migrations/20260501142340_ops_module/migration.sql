-- CreateEnum
CREATE TYPE "OpsServiceType" AS ENUM ('POOL_CLEAN', 'POOL_CHEMICAL', 'GAS_REFILL', 'GRASS_CUT', 'ELECTRICITY_PURCHASE', 'SOLAR_TELEMETRY', 'OTHER');

-- CreateTable
CREATE TABLE "OpsService" (
    "id" TEXT NOT NULL,
    "type" "OpsServiceType" NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(10,2),
    "vendor" TEXT,
    "note" TEXT,
    "proofUrl" TEXT,
    "meta" JSONB,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OpsService_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OpsStock" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "unit" TEXT NOT NULL,
    "threshold" DECIMAL(10,2),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OpsStock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OpsService_type_date_idx" ON "OpsService"("type", "date");

-- CreateIndex
CREATE INDEX "OpsService_date_idx" ON "OpsService"("date");

-- CreateIndex
CREATE UNIQUE INDEX "OpsStock_key_key" ON "OpsStock"("key");
