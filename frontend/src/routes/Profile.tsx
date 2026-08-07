import { useState, type FormEvent } from "react";
import { useAuth } from "../context/AuthContext";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { api, ApiError } from "../api/client";

export function Profile() {
  const { user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match");
      return;
    }

    setSubmitting(true);
    try {
      await api.post("/api/auth/change-password", { currentPassword, newPassword });
      setSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex max-w-lg flex-col gap-4">
      <h1 className="text-xl font-semibold text-slate-900">Profile</h1>

      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500">Name</p>
            <p className="font-medium text-slate-900">{user?.name}</p>
          </div>
          <Badge tone={user?.role === "ADMIN" ? "success" : "neutral"}>{user?.role}</Badge>
        </div>
        <div className="mt-3">
          <p className="text-sm text-slate-500">Email</p>
          <p className="font-medium text-slate-900">{user?.email}</p>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="mb-4 text-sm font-semibold text-slate-900">Change password</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            id="currentPassword"
            type="password"
            label="Current password"
            autoComplete="current-password"
            required
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
          <Input
            id="newPassword"
            type="password"
            label="New password"
            autoComplete="new-password"
            required
            minLength={8}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <Input
            id="confirmPassword"
            type="password"
            label="Confirm new password"
            autoComplete="new-password"
            required
            minLength={8}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
          {error && <p className="text-sm text-status-danger-text">{error}</p>}
          {success && <p className="text-sm text-status-success-text">Password changed successfully.</p>}
          <Button type="submit" disabled={submitting} className="self-start">
            {submitting ? "Saving…" : "Change password"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
