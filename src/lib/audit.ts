import type { PrismaClient, AuditAction } from "@prisma/client";

export async function writeAuditLog(
  prisma: PrismaClient,
  entry: {
    action: AuditAction;
    bookingId?: string;
    userId?: string;
    actorEmail?: string;
    detail?: string;
  }
): Promise<void> {
  await prisma.auditLog.create({ data: entry });
}
