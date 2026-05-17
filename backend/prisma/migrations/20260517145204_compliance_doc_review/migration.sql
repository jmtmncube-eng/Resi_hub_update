-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "reviewNote" TEXT,
ADD COLUMN     "reviewedAt" TIMESTAMP(3),
ADD COLUMN     "reviewedBy" TEXT;

-- CreateIndex
CREATE INDEX "Document_status_idx" ON "Document"("status");
