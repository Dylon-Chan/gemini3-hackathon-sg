import { LocationInfo } from "@/lib/sse";

interface Props {
  location: LocationInfo | null;
}

export function LocationBadge({ location }: Props) {
  if (!location) {
    return (
      <div className="flex items-center gap-2 text-zinc-500">
        <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
        <span className="text-sm">Analysing location...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center gap-2">
        <span className="text-amber-400 text-sm">📍</span>
        <span className="text-white font-semibold text-sm truncate max-w-[260px]">
          {location.location_name}
        </span>
        {location.confidence > 0.7 && (
          <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/30 shrink-0">
            ✓ Identified
          </span>
        )}
      </div>
      <div className="text-zinc-500 text-xs pl-6">
        {location.coordinates.lat.toFixed(4)}°N,{" "}
        {location.coordinates.lng.toFixed(4)}°E · {location.neighborhood}
      </div>
    </div>
  );
}
