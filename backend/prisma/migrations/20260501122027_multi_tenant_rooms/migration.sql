-- DropIndex
DROP INDEX "Allocation_roomId_key";

-- AlterTable
ALTER TABLE "Room" ADD COLUMN     "capacity" INTEGER NOT NULL DEFAULT 1;

-- CreateIndex
CREATE INDEX "Allocation_roomId_idx" ON "Allocation"("roomId");
