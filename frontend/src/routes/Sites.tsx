import { useEffect, useState } from "react";
import { api, ApiError } from "../api/client";
import type { Site } from "../types";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/ui/Button";
import { SitesListPanel } from "../components/sites/SitesListPanel";
import { SiteMap } from "../components/sites/SiteMap";
import { SiteFormPanel } from "../components/sites/SiteFormPanel";

type PanelMode = { type: "create" } | { type: "edit"; site: Site };

export function Sites() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [panelMode, setPanelMode] = useState<PanelMode | null>(null);
  const [draftLat, setDraftLat] = useState("");
  const [draftLng, setDraftLng] = useState("");

  async function loadSites() {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<{ sites: Site[] }>("/api/sites");
      setSites(data.sites);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load sites");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSites();
  }, []);

  function openCreate() {
    setPanelMode({ type: "create" });
    setDraftLat("");
    setDraftLng("");
  }

  function openEdit(site: Site) {
    setPanelMode({ type: "edit", site });
    setDraftLat(site.latitude != null ? String(site.latitude) : "");
    setDraftLng(site.longitude != null ? String(site.longitude) : "");
  }

  function handleLatLngChange(lat: number, lng: number) {
    setDraftLat(lat.toFixed(6));
    setDraftLng(lng.toFixed(6));
  }

  function handleSaved(site: Site) {
    setSites((prev) => {
      const exists = prev.some((s) => s.id === site.id);
      return exists ? prev.map((s) => (s.id === site.id ? site : s)) : [site, ...prev];
    });
    setPanelMode(null);
  }

  function handleDeleted(id: string) {
    setSites((prev) => prev.filter((s) => s.id !== id));
    setPanelMode(null);
  }

  const selectedSiteId = panelMode?.type === "edit" ? panelMode.site.id : undefined;

  return (
    <div className="flex h-[calc(100vh-8.5rem)] min-h-[500px] flex-col gap-4 md:flex-row">
      <div className={`${panelMode ? "hidden md:flex" : "flex"} min-h-0 flex-col md:w-80 md:shrink-0`}>
        <SitesListPanel
          sites={sites}
          loading={loading}
          error={error}
          isAdmin={isAdmin}
          selectedSiteId={selectedSiteId}
          onSelectSite={openEdit}
          onAddNew={openCreate}
        />
      </div>

      <div className="hidden min-h-0 flex-1 md:block">
        <SiteMap
          sites={sites}
          draft={panelMode ? { latitude: draftLat ? Number(draftLat) : null, longitude: draftLng ? Number(draftLng) : null } : null}
          onPlaceDraft={panelMode ? handleLatLngChange : undefined}
          onSelectSite={openEdit}
        />
      </div>

      <div
        className={`${
          panelMode ? "flex" : "hidden md:flex"
        } min-h-0 flex-col rounded-xl border border-border bg-surface p-4 md:w-96 md:shrink-0`}
      >
        {panelMode ? (
          <SiteFormPanel
            key={panelMode.type === "create" ? "create" : panelMode.site.id}
            mode={panelMode}
            latitude={draftLat}
            longitude={draftLng}
            onLatLngChange={handleLatLngChange}
            contextSites={sites}
            onSaved={handleSaved}
            onDeleted={handleDeleted}
            onCancel={() => setPanelMode(null)}
          />
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center text-slate-500">
            <span className="text-3xl">📍</span>
            <p className="text-sm">Select a site to view details, or add a new one.</p>
            <Button onClick={openCreate}>+ Add New Site</Button>
          </div>
        )}
      </div>
    </div>
  );
}
