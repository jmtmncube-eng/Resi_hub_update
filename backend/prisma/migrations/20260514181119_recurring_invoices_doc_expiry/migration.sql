-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "expiresAt" TIMESTAMP(3),
ADD COLUMN     "expiryNotifiedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "ResidenceSettings" ADD COLUMN     "autoInvoiceDay" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "autoInvoiceEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "autoInvoiceLastRun" TEXT;

-- CreateIndex
CREATE INDEX "Document_expiresAt_idx" ON "Document"("expiresAt");
