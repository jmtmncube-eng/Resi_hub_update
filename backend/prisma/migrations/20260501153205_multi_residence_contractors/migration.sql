-- CreateEnum
CREATE TYPE "ContractorType" AS ENUM ('CLEANER', 'GROUNDSKEEPER', 'GARDENER', 'OTHER');

-- AlterTable
ALTER TABLE "Room" ADD COLUMN     "residenceId" TEXT;

-- CreateTable
CREATE TABLE "Residence" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tagline" TEXT,
    "address" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "description" TEXT,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Residence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceContractor" (
    "id" TEXT NOT NULL,
    "residenceId" TEXT NOT NULL,
    "type" "ContractorType" NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "rate" DECIMAL(10,2) NOT NULL,
    "rateUnit" TEXT NOT NULL DEFAULT 'month',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceContractor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractorInvoice" (
    "id" TEXT NOT NULL,
    "contractorId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Pending',
    "proofUrl" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContractorInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ServiceContractor_residenceId_idx" ON "ServiceContractor"("residenceId");

-- CreateIndex
CREATE INDEX "ServiceContractor_type_idx" ON "ServiceContractor"("type");

-- CreateIndex
CREATE INDEX "ContractorInvoice_status_idx" ON "ContractorInvoice"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ContractorInvoice_contractorId_period_key" ON "ContractorInvoice"("contractorId", "period");

-- CreateIndex
CREATE INDEX "Room_residenceId_idx" ON "Room"("residenceId");

-- AddForeignKey
ALTER TABLE "Room" ADD CONSTRAINT "Room_residenceId_fkey" FOREIGN KEY ("residenceId") REFERENCES "Residence"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceContractor" ADD CONSTRAINT "ServiceContractor_residenceId_fkey" FOREIGN KEY ("residenceId") REFERENCES "Residence"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorInvoice" ADD CONSTRAINT "ContractorInvoice_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "ServiceContractor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
