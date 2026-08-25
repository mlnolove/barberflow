export type AuditActorType = "USER" | "CLIENT" | "SYSTEM";

export interface AuditLogEntry {
  id: string;
  actor_type: AuditActorType;
  actor_user_id: string | null;
  actor_client_id: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  metadata_json: Record<string, unknown> | null;
  created_at: string;
}
