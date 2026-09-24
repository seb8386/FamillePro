import { db } from "@/db";
import { auditLogs } from "@/db/schema";

export async function logAudit({
  familyId,
  userId,
  action,
  entityType,
  entityId,
  metadata,
  ipAddress,
}: {
  familyId?: string;
  userId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
}) {
  await db.insert(auditLogs).values({
    familyId: familyId ?? undefined,
    userId: userId ?? undefined,
    action,
    entityType,
    entityId: entityId ?? undefined,
    metadata,
    ipAddress,
  });
}
