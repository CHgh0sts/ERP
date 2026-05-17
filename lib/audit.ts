import { prisma } from "@/lib/db";

export async function audit(params: {
  userId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  diff?: unknown;
  ip?: string | null;
  userAgent?: string | null;
}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId ?? null,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId ?? null,
        diff: params.diff ? JSON.stringify(params.diff) : null,
        ip: params.ip ?? null,
        userAgent: params.userAgent ?? null,
      },
    });
  } catch {
    // audit ne doit jamais faire echouer une operation
  }
}
