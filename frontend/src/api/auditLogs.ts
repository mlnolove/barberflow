import { api } from "@/lib/api";
import type { AuditLogEntry } from "@/types/auditLog";
import type { Page } from "@/types/common";

export async function listAuditLogs(page = 1, limit = 50): Promise<Page<AuditLogEntry>> {
  const { data } = await api.get<Page<AuditLogEntry>>("/audit-logs", { params: { page, limit } });
  return data;
}
