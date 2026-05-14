-- CreateEnum
CREATE TYPE "DepositStatus" AS ENUM ('NONE', 'HELD', 'PARTIALLY_REFUNDED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "InspectionType" AS ENUM ('MOVE_IN', 'ROUTINE', 'MOVE_OUT');

-- AlterTable
ALTER TABLE "Allocation" ADD COLUMN     "depositAmount" DECIMAL(10,2),
ADD COLUMN     "depositNote" TEXT,
ADD COLUMN     "depositRefunded" DECIMAL(10,2),
ADD COLUMN     "depositStatus" "DepositStatus" NOT NULL DEFAULT 'NONE',
ADD COLUMN     "leaseEnd" TIMESTAMP(3),
ADD COLUMN     "leaseStart" TIMESTAMP(3),
ADD COLUMN     "moveOutCompletedAt" TIMESTAMP(3),
ADD COLUMN     "moveOutDate" TIMESTAMP(3),
ADD COLUMN     "noticeGivenAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "Inspection" (
    "id" TEXT NOT NULL,
    "allocationId" TEXT NOT NULL,
    "type" "InspectionType" NOT NULL,
    "inspectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "condition" TEXT NOT NULL,
    "notes" TEXT,
    "photoUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "inspectorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Inspection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Inspection_allocationId_idx" ON "Inspection"("allocationId");

-- AddForeignKey
ALTER TABLE "Inspection" ADD CONSTRAINT "Inspection_allocationId_fkey" FOREIGN KEY ("allocationId") REFERENCES "Allocation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
