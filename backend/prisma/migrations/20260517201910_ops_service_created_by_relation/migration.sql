-- CreateIndex
CREATE INDEX "OpsService_createdById_idx" ON "OpsService"("createdById");

-- AddForeignKey
ALTER TABLE "OpsService" ADD CONSTRAINT "OpsService_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
