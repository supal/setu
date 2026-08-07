import type { ReactNode } from "react";
import { Card } from "../ui/Card";

export function AuthLayout({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-muted px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center justify-center gap-2">
          <span className="text-brand-600 text-xl">📍</span>
          <span className="text-xl font-semibold text-slate-900">SiteTracker</span>
        </div>
        <Card className="p-6">
          <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
          <div className="mt-5">{children}</div>
        </Card>
      </div>
    </div>
  );
}
