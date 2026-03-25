import { Prisma } from '@prisma/client';
import prisma from '../config/database';

interface AuditParams {
  userId: string;
  action: string;
  entity: string;
  entityId?: string;
  meta?: Prisma.InputJsonObject;
  ip?: string;
}

export async function createAuditLog(params: AuditParams): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId:   params.userId,
        action:   params.action,
        entity:   params.entity,
        entityId: params.entityId,
        meta:     params.meta ?? {},
        ip:       params.ip,
      },
    });
  } catch (err) {
    // Audit log failures should never crash the app — log and continue
    console.error('[AuditLog] Failed to write audit record:', err);
  }
}
