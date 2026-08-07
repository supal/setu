import { NavLink } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const linkBase =
  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors";
const linkInactive = "text-slate-600 hover:bg-surface-muted";
const linkActive = "bg-brand-50 text-brand-700";

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const { user } = useAuth();

  return (
    <nav className="flex flex-col gap-1 p-3">
      <NavLink
        to="/overview"
        onClick={onNavigate}
        className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkInactive}`}
      >
        Overview
      </NavLink>
      <NavLink
        to="/sites"
        onClick={onNavigate}
        className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkInactive}`}
      >
        Sites
      </NavLink>
      {user?.role === "ADMIN" && (
        <>
          <NavLink
            to="/users"
            onClick={onNavigate}
            className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkInactive}`}
          >
            Users <span className="text-xs text-slate-400">(Admin Only)</span>
          </NavLink>
          <NavLink
            to="/audit-log"
            onClick={onNavigate}
            className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkInactive}`}
          >
            Audit Log <span className="text-xs text-slate-400">(Admin Only)</span>
          </NavLink>
        </>
      )}
    </nav>
  );
}

export function Sidebar() {
  return (
    <aside className="hidden w-60 shrink-0 border-r border-border bg-surface md:block">
      <div className="flex items-center gap-2 border-b border-border px-4 py-4">
        <span className="text-brand-600">📍</span>
        <span className="text-lg font-semibold text-slate-900">SiteTracker</span>
      </div>
      <SidebarNav />
    </aside>
  );
}
