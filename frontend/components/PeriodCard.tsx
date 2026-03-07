"use client";
import { Period, PERIOD_COLORS, PERIOD_LABELS } from "@/lib/constants";
import { PeriodState } from "@/lib/sse";
import { API_BASE } from "@/lib/constants";

interface Props {
  period: Period;
  state?: PeriodState;
  isSelected: boolean;
  onClick: () => void;
}

const STAGE_LABELS: Record<string, string> = {
  pending: "Waiting",
  researching: "Researching...",
  image_generating: "Imaging...",
  video_generating: "Generating video...",
  complete: "Ready ▶",
  error: "Failed",
};

export function PeriodCard({ period, state, isSelected, onClick }: Props) {
  const colors = PERIOD_COLORS[period];
  const stage = state?.stage ?? "pending";
  const isPast = ["1925", "1965", "1985"].includes(period);
  const isPresent = period === "present";
  const isActive = ["researching", "image_generating", "video_generating"].includes(stage);

  return (
    <button
      onClick={onClick}
      className={`
        relative flex flex-col rounded-xl overflow-hidden border transition-all duration-300 cursor-pointer text-left
        ${
          isSelected
            ? `${colors.border} ${colors.bg} ring-2 ${colors.ring}`
            : "border-zinc-800 bg-zinc-900 hover:border-zinc-600"
        }
      `}
    >
      {/* Thumbnail area */}
      <div className="relative aspect-video bg-zinc-950 overflow-hidden">
        {state?.reference_image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`${API_BASE}${state.reference_image_url}`}
            alt={`${PERIOD_LABELS[period]} reference`}
            className="w-full h-full object-cover"
          />
        )}

        {/* Video generating overlay on reference image */}
        {stage === "video_generating" && state?.reference_image_url && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <div
              className={`w-5 h-5 border-2 ${colors.border} border-t-transparent rounded-full animate-spin`}
            />
          </div>
        )}

        {/* Complete: play icon */}
        {stage === "complete" && (
          <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black/30">
            <div className="w-10 h-10 rounded-full bg-black/60 flex items-center justify-center border border-white/30">
              <span className="text-white text-lg ml-1">▶</span>
            </div>
          </div>
        )}

        {/* No image yet */}
        {!state?.reference_image_url && (
          <div className="absolute inset-0 flex items-center justify-center">
            {stage === "pending" && (
              <span className="text-zinc-700 text-xl">⏸</span>
            )}
            {stage === "researching" && (
              <div
                className={`w-4 h-4 border-2 ${colors.border} border-t-transparent rounded-full animate-spin`}
              />
            )}
          </div>
        )}

        {/* Period badge */}
        <div className="absolute top-1 left-1">
          {isPast && (
            <span className="text-[10px] text-zinc-600 font-medium">◄ PAST</span>
          )}
          {!isPast && !isPresent && (
            <span className="text-[10px] text-zinc-600 font-medium">FUTURE ►</span>
          )}
          {isPresent && (
            <span className="text-[10px] bg-white/20 text-white px-1 rounded font-bold">
              NOW
            </span>
          )}
        </div>
      </div>

      {/* Label */}
      <div className="p-2 pb-3">
        <div className={`text-sm font-bold ${colors.text}`}>
          {PERIOD_LABELS[period]}
        </div>
        <div className="text-[11px] text-zinc-500 mt-0.5 truncate">
          {STAGE_LABELS[stage]}
        </div>
      </div>

      {/* Active pulse bar */}
      {isActive && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 overflow-hidden">
          <div
            className={`h-full w-full ${colors.bg} animate-pulse`}
            style={{ background: "currentColor" }}
          />
        </div>
      )}
    </button>
  );
}
