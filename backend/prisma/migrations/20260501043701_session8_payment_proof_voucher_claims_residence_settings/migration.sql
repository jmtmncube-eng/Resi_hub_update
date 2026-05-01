-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "clearedAt" TIMESTAMP(3),
ADD COLUMN     "clearedBy" TEXT,
ADD COLUMN     "proofStatus" TEXT,
ADD COLUMN     "proofUrl" TEXT;

-- AlterTable
ALTER TABLE "Voucher" ADD COLUMN     "imageUrl" TEXT,
ADD COLUMN     "pin" TEXT,
ADD COLUMN     "requiresProof" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "taskTitle" TEXT;

-- CreateTable
CREATE TABLE "VoucherClaim" (
    "id" TEXT NOT NULL,
    "voucherId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "proofUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "adminNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VoucherClaim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResidenceSettings" (
    "id" TEXT NOT NULL DEFAULT 'settings',
    "name" TEXT NOT NULL DEFAULT 'ResiHub Student Residence',
    "tagline" TEXT,
    "address" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "description" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResidenceSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VoucherClaim_status_idx" ON "VoucherClaim"("status");

-- CreateIndex
CREATE INDEX "VoucherClaim_voucherId_idx" ON "VoucherClaim"("voucherId");

-- CreateIndex
CREATE INDEX "VoucherClaim_userId_idx" ON "VoucherClaim"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "VoucherClaim_voucherId_userId_key" ON "VoucherClaim"("voucherId", "userId");

-- CreateIndex
CREATE INDEX "Document_proofStatus_idx" ON "Document"("proofStatus");

-- AddForeignKey
ALTER TABLE "VoucherClaim" ADD CONSTRAINT "VoucherClaim_voucherId_fkey" FOREIGN KEY ("voucherId") REFERENCES "Voucher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoucherClaim" ADD CONSTRAINT "VoucherClaim_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
