import { useState, type ReactNode } from "react";
import { useAuth } from "../../context/AuthContext";
import { Sidebar, SidebarNav } from "./Sidebar";
import { Link } from "react-router-dom";

export function AppShell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-surface-muted">
      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-4 border-b border-border bg-surface px-4 py-3 md:px-6">
          <div className="flex items-center gap-3 md:hidden">
            <button
              onClick={() => setMobileNavOpen((v) => !v)}
              className="rounded-md p-2 text-slate-600 hover:bg-surface-muted"
              aria-label="Toggle navigation"
            >
              ☰
            </button>
            <span className="font-semibold text-slate-900">SiteTracker</span>
          </div>

          <div className="hidden md:block" />

          <div className="flex items-center gap-3">
            <Link
              to="/profile"
              className="text-sm text-slate-600 hover:text-brand-600"
            >
              {user?.name}
            </Link>
            <button
              onClick={() => logout()}
              className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-surface-muted"
            >
              Log out
            </button>
          </div>
        </header>

        {mobileNavOpen && (
          <div className="border-b border-border bg-surface md:hidden">
            <SidebarNav onNavigate={() => setMobileNavOpen(false)} />
          </div>
        )}

        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
