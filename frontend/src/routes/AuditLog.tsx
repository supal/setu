import { useEffect, useState } from "react";
import { api, ApiError } from "../api/client";
import type { AuditLogEntry } from "../types";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";

const ACTION_TONE: Record<string, "success" | "warning" | "neutral" | "danger"> = {
  LOGIN_SUCCESS: "success",
  LOGIN_FAILED: "danger",
  PASSWORD_CHANGED: "neutral",
  PASSWORD_RESET_REQUESTED: "neutral",
  PASSWORD_RESET_COMPLETED: "neutral",
  CREATE_USER: "success",
  UPDATE_USER: "warning",
  DELETE_USER: "danger",
  CREATE_SITE: "success",
  UPDATE_SITE: "warning",
  DELETE_SITE: "danger",
};

export function AuditLog() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<{ logs: AuditLogEntry[] }>("/api/audit-logs")
      .then((data) => setLogs(data.logs))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load audit log"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-slate-900">Audit Log</h1>

      <Card className="overflow-hidden">
        {loading ? (
          <p className="p-6 text-sm text-slate-500">Loading…</p>
        ) : error ? (
          <p className="p-6 text-sm text-status-danger-text">{error}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-surface-muted text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Time</th>
                  <th className="px-4 py-3 font-medium">Actor</th>
                  <th className="px-4 py-3 font-medium">Action</th>
                  <th className="px-4 py-3 font-medium">Entity</th>
                  <th className="px-4 py-3 font-medium">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-500">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {log.actor ? `${log.actor.name} (${log.actor.email})` : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={ACTION_TONE[log.action] ?? "neutral"}>{log.action}</Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {log.entityType}
                      {log.entityId ? ` · ${log.entityId.slice(0, 8)}` : ""}
                    </td>
                    <td className="max-w-xs truncate px-4 py-3 text-slate-500" title={JSON.stringify(log.metadata)}>
                      {log.metadata ? JSON.stringify(log.metadata) : "—"}
                    </td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                      No audit entries yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
