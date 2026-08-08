import { useMemo, useState } from "react";
import { resolveFileUrl } from "../../api/client";
import type { ConstructionStatus, Site } from "../../types";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";

const STATUS_LABEL: Record<ConstructionStatus, string> = {
  planned: "Planned",
  in_progress: "In Progress",
  completed: "Completed",
};

const STATUS_TONE: Record<ConstructionStatus, "neutral" | "warning" | "success"> = {
  planned: "neutral",
  in_progress: "warning",
  completed: "success",
};

export function SitesListPanel({
  sites,
  loading,
  error,
  isAdmin,
  selectedSiteId,
  onSelectSite,
  onAddNew,
}: {
  sites: Site[];
  loading: boolean;
  error: string | null;
  isAdmin: boolean;
  selectedSiteId?: string;
  onSelectSite: (site: Site) => void;
  onAddNew: () => void;
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sites;
    return sites.filter((site) =>
      [site.name, site.address ?? "", STATUS_LABEL[site.constructionStatus]].some((field) =>
        field.toLowerCase().includes(q)
      )
    );
  }, [sites, query]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-semibold text-slate-900">Sites</h1>
        <Button onClick={onAddNew}>+ Add New Site</Button>
      </div>

      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
        <input
          type="search"
          placeholder="Search…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full rounded-lg border border-border py-2 pl-9 pr-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
        />
      </div>

      <div className="flex-1 overflow-y-auto rounded-lg border border-border bg-surface">
        {loading ? (
          <p className="p-4 text-sm text-slate-500">Loading…</p>
        ) : error ? (
          <p className="p-4 text-sm text-status-danger-text">{error}</p>
        ) : filtered.length === 0 ? (
          <p className="p-4 text-sm text-slate-500">No sites match your search.</p>
        ) : (
          <ul className="divide-y divide-border">
            {filtered.map((site) => {
              const cover = site.files.find((f) => f.isCover);
              return (
                <li key={site.id}>
                  <button
                    type="button"
                    onClick={() => onSelectSite(site)}
                    className={`flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-surface-muted ${
                      selectedSiteId === site.id ? "bg-brand-50" : ""
                    }`}
                  >
                    {cover ? (
                      <img
                        src={resolveFileUrl(cover.url) ?? undefined}
                        alt={site.name}
                        className="h-10 w-10 shrink-0 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="h-10 w-10 shrink-0 rounded-lg bg-surface-muted" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium text-slate-900">{site.name}</p>
                        <Badge tone={STATUS_TONE[site.constructionStatus]}>
                          {STATUS_LABEL[site.constructionStatus]}
                        </Badge>
                      </div>
                      {site.address && <p className="truncate text-xs text-slate-500">{site.address}</p>}
                      {isAdmin && <p className="truncate text-xs text-slate-400">by {site.user.name}</p>}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
