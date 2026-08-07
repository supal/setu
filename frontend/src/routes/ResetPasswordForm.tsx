import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AuthLayout } from "../components/layout/AuthLayout";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";
import { api, ApiError } from "../api/client";

export function ResetPasswordForm({ title, subtitle }: { title: string; subtitle: string }) {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setSubmitting(true);
    try {
      await api.post("/api/auth/reset-password", { token, password });
      navigate("/login", { replace: true, state: { justReset: true } });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  if (!token) {
    return (
      <AuthLayout title="Invalid link">
        <p className="text-sm text-slate-600">This link is missing a token. Please request a new one.</p>
        <Link to="/forgot-password" className="mt-4 inline-block text-sm text-brand-600 hover:underline">
          Request a new link
        </Link>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title={title} subtitle={subtitle}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          id="password"
          type="password"
          label="New password"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Input
          id="confirmPassword"
          type="password"
          label="Confirm password"
          autoComplete="new-password"
          required
          minLength={8}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
        {error && <p className="text-sm text-status-danger-text">{error}</p>}
        <Button type="submit" disabled={submitting} className="w-full">
          {submitting ? "Saving…" : "Set password"}
        </Button>
      </form>
    </AuthLayout>
  );
}
