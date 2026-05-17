-- CreateTable
CREATE TABLE "MaintenanceTicketUpdate" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "actorId" TEXT,
    "actorName" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "changes" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MaintenanceTicketUpdate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MaintenanceTicketUpdate_ticketId_createdAt_idx" ON "MaintenanceTicketUpdate"("ticketId", "createdAt");

-- AddForeignKey
ALTER TABLE "MaintenanceTicketUpdate" ADD CONSTRAINT "MaintenanceTicketUpdate_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "MaintenanceTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
