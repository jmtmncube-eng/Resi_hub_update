-- Batch A — reconcile schema drift.
-- Everything below was applied to live databases via `prisma db push`
-- during rapid iteration. This migration captures that drift so the
-- project is back on a clean, versioned migration history. On databases
-- that already have these objects (from the db-push era), deploy.sh
-- baselines this migration with `migrate resolve --applied` so the SQL
-- is recorded but not re-run; on a fresh database it runs normally.

-- CreateEnum
CREATE TYPE "ContractorPaymentType" AS ENUM ('FIXED', 'VARIABLE');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED');

-- AlterEnum
ALTER TYPE "DocumentType" ADD VALUE 'ID_DOC';
ALTER TYPE "DocumentType" ADD VALUE 'PROOF_REGISTRATION';
ALTER TYPE "DocumentType" ADD VALUE 'PROOF_FUNDING';
ALTER TYPE "DocumentType" ADD VALUE 'SIGNATURE';

-- DropIndex
DROP INDEX "OpsStock_key_key";

-- AlterTable
ALTER TABLE "Allocation" ADD COLUMN     "electricitySelfManaged" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Chore" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "creditReward" INTEGER NOT NULL DEFAULT 20,
ADD COLUMN     "residenceId" TEXT;

-- AlterTable
ALTER TABLE "MaintenanceTicket" ADD COLUMN     "residenceId" TEXT;

-- AlterTable
ALTER TABLE "News" ADD COLUMN     "residenceId" TEXT;

-- AlterTable
ALTER TABLE "OpsService" ADD COLUMN     "residenceId" TEXT;

-- AlterTable
ALTER TABLE "OpsStock" ADD COLUMN     "residenceId" TEXT;

-- AlterTable
ALTER TABLE "ServiceContractor" ADD COLUMN     "paymentType" "ContractorPaymentType" NOT NULL DEFAULT 'FIXED';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "applicationAdminNote" TEXT,
ADD COLUMN     "applicationApprovedAt" TIMESTAMP(3),
ADD COLUMN     "applicationRejectedAt" TIMESTAMP(3),
ADD COLUMN     "applicationStatus" "ApplicationStatus" NOT NULL DEFAULT 'DRAFT',
ADD COLUMN     "applicationSubmittedAt" TIMESTAMP(3),
ADD COLUMN     "idNumber" TEXT;

-- CreateIndex
CREATE INDEX "Chore_residenceId_idx" ON "Chore"("residenceId");

-- CreateIndex
CREATE INDEX "News_residenceId_idx" ON "News"("residenceId");

-- CreateIndex
CREATE INDEX "OpsService_residenceId_idx" ON "OpsService"("residenceId");

-- CreateIndex
CREATE INDEX "OpsStock_residenceId_idx" ON "OpsStock"("residenceId");

-- CreateIndex
CREATE UNIQUE INDEX "OpsStock_residenceId_key_key" ON "OpsStock"("residenceId", "key");

-- AddForeignKey
ALTER TABLE "MaintenanceTicket" ADD CONSTRAINT "MaintenanceTicket_residenceId_fkey" FOREIGN KEY ("residenceId") REFERENCES "Residence"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Chore" ADD CONSTRAINT "Chore_residenceId_fkey" FOREIGN KEY ("residenceId") REFERENCES "Residence"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "News" ADD CONSTRAINT "News_residenceId_fkey" FOREIGN KEY ("residenceId") REFERENCES "Residence"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpsService" ADD CONSTRAINT "OpsService_residenceId_fkey" FOREIGN KEY ("residenceId") REFERENCES "Residence"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpsStock" ADD CONSTRAINT "OpsStock_residenceId_fkey" FOREIGN KEY ("residenceId") REFERENCES "Residence"("id") ON DELETE SET NULL ON UPDATE CASCADE;
