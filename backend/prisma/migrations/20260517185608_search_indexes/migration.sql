-- CreateIndex
CREATE INDEX "Document_period_idx" ON "Document"("period");

-- CreateIndex
CREATE INDEX "MaintenanceTicket_category_idx" ON "MaintenanceTicket"("category");

-- CreateIndex
CREATE INDEX "MaintenanceTicket_location_idx" ON "MaintenanceTicket"("location");

-- CreateIndex
CREATE INDEX "Room_number_idx" ON "Room"("number");

-- CreateIndex
CREATE INDEX "User_name_idx" ON "User"("name");
