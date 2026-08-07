import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { AuthLayout } from "../components/layout/AuthLayout";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";
import { api, ApiError } from "../api/client";

export function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.post("/api/auth/forgot-password", { email });
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <AuthLayout title="Check your email">
        <p className="text-sm text-slate-600">
          If an account exists for <strong>{email}</strong>, we've sent a link to reset your password.
        </p>
        <Link to="/login" className="mt-4 inline-block text-sm text-brand-600 hover:underline">
          Back to log in
        </Link>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Forgot password" subtitle="Enter your email and we'll send you a reset link.">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          id="email"
          type="email"
          label="Email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        {error && <p className="text-sm text-status-danger-text">{error}</p>}
        <Button type="submit" disabled={submitting} className="w-full">
          {submitting ? "Sending…" : "Send reset link"}
        </Button>
        <Link to="/login" className="text-center text-sm text-brand-600 hover:underline">
          Back to log in
        </Link>
      </form>
    </AuthLayout>
  );
}
