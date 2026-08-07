import { useEffect, useMemo } from "react";
import L from "leaflet";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import "leaflet/dist/leaflet.css";
import type { Site } from "../../types";

// Vite doesn't resolve Leaflet's default marker image URLs correctly out of the box —
// point them at the bundled assets explicitly.
const siteIcon = L.icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// A visually distinct marker for the site currently being created/edited, so it doesn't
// get lost among the other pins.
const draftIcon = L.divIcon({
  className: "",
  html: `<div style="width:20px;height:20px;border-radius:9999px;background:#2563eb;border:3px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.4);"></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

const DEFAULT_CENTER: [number, number] = [23.8103, 90.4125]; // arbitrary starting view

function ClickHandler({ onPlaceDraft }: { onPlaceDraft: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPlaceDraft(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// Sites can be scattered anywhere in the world — a fixed initial zoom would leave most
// pins off-screen. Fit the viewport to whatever's actually there whenever the set of
// points changes, instead of relying on MapContainer's mount-only center/zoom.
function FitToPoints({ points }: { points: [number, number][] }) {
  const map = useMap();
  const key = points.map((p) => p.join(",")).join("|");

  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView(points[0], 13);
    } else {
      // Extra top-left padding keeps pins clear of the zoom control, which sits there.
      map.fitBounds(points, { paddingTopLeft: [50, 60], paddingBottomRight: [32, 32], maxZoom: 15 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return null;
}

export function SiteMap({
  sites,
  draft,
  onPlaceDraft,
  onSelectSite,
  compact = false,
}: {
  sites: Site[];
  draft?: { latitude: number | null; longitude: number | null } | null;
  onPlaceDraft?: (lat: number, lng: number) => void;
  onSelectSite?: (site: Site) => void;
  compact?: boolean;
}) {
  const pins = useMemo(
    () => sites.filter((s): s is Site & { latitude: number; longitude: number } => s.latitude != null && s.longitude != null),
    [sites]
  );

  const hasDraftCoords = draft && draft.latitude != null && draft.longitude != null;

  // When a site is selected (a draft is active), zoom to just that entry rather than
  // fitting a bounding box around every pin — the other pins stay visible for context,
  // they just don't drive the viewport anymore.
  const fitPoints = useMemo<[number, number][]>(() => {
    if (hasDraftCoords) return [[draft!.latitude!, draft!.longitude!]];
    return pins.map((s): [number, number] => [s.latitude, s.longitude]);
  }, [pins, hasDraftCoords, draft]);

  return (
    <div className={`overflow-hidden rounded-lg border border-border ${compact ? "h-48" : "h-full"}`}>
      <MapContainer center={DEFAULT_CENTER} zoom={5} className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitToPoints points={fitPoints} />
        {onPlaceDraft && <ClickHandler onPlaceDraft={onPlaceDraft} />}
        {pins.map((site) => (
          <Marker
            key={site.id}
            position={[site.latitude, site.longitude]}
            icon={siteIcon}
            eventHandlers={onSelectSite ? { click: () => onSelectSite(site) } : undefined}
          />
        ))}
        {hasDraftCoords && (
          <Marker
            position={[draft!.latitude!, draft!.longitude!]}
            icon={draftIcon}
            draggable={Boolean(onPlaceDraft)}
            eventHandlers={
              onPlaceDraft
                ? {
                    dragend: (e) => {
                      const { lat, lng } = e.target.getLatLng();
                      onPlaceDraft(lat, lng);
                    },
                  }
                : undefined
            }
          />
        )}
      </MapContainer>
    </div>
  );
}
