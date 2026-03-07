"use client";
import { Period, PERIOD_COLORS, PERIOD_LABELS } from "@/lib/constants";
import { PeriodState } from "@/lib/sse";
import { API_BASE } from "@/lib/constants";
import { motion } from "framer-motion";

interface Props {
  period: Period;
  state?: PeriodState;
  isSelected: boolean;
  onClick: () => void;
  originalImageUrl?: string;
}

const STAGE_LABELS: Record<string, string> = {
  pending: "Waiting",
  researching: "Researching...",
  image_generating: "Imaging...",
  video_generating: "Generating video...",
  complete: "Ready ▶",
  error: "Failed",
};

export function PeriodCard({ period, state, isSelected, onClick, originalImageUrl }: Props) {
  const colors = PERIOD_COLORS[period];
  const stage = state?.stage ?? "pending";
  const isPast = ["1925", "1965", "1985"].includes(period);
  const isPresent = period === "present";
  const isActive = ["researching", "image_generating", "video_generating"].includes(stage);

  return (
    <motion.button
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`
        relative flex flex-col rounded-2xl overflow-hidden border transition-all duration-300 cursor-pointer text-left glass-panel backdrop-blur-xl shadow-lg
        ${
          isSelected
            ? `${colors.border} bg-zinc-900/80 ring-2 ${colors.ring} shadow-[0_0_15px_rgba(255,255,255,0.1)] z-10 scale-[1.03]`
            : "border-zinc-800/60 bg-zinc-900/40 hover:border-zinc-600 hover:bg-zinc-800/60"
        }
      `}
    >
      {/* Thumbnail area */}
      <div className="relative aspect-video bg-black/60 overflow-hidden">
        {/* Present period: show the uploaded photo */}
        {isPresent && originalImageUrl && (
          <motion.img
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            src={`${API_BASE}${originalImageUrl}`}
            alt="Current location"
            className="w-full h-full object-cover transition-transform duration-700 hover:scale-110"
          />
        )}

        {/* Other periods: show AI-generated reference image */}
        {!isPresent && state?.reference_image_url && (
          <motion.img
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            src={`${API_BASE}${state.reference_image_url}`}
            alt={`${PERIOD_LABELS[period]} reference`}
            className="w-full h-full object-cover transition-transform duration-700 hover:scale-110"
          />
        )}

        {/* Video generating overlay on reference image */}
        {stage === "video_generating" && state?.reference_image_url && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center">
            <div
              className={`w-6 h-6 border-2 ${colors.border} border-t-transparent rounded-full animate-spin shadow-[0_0_10px_currentColor]`}
              style={{ color: colors.text.split("-")[1] }} /* rough approximation for shadow color based on class */
            />
          </div>
        )}

        {/* Complete: play icon */}
        {stage === "complete" && (
          <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black/40 backdrop-blur-sm">
            <motion.div 
              whileHover={{ scale: 1.1 }}
              className={`w-12 h-12 rounded-full bg-black/80 flex items-center justify-center border border-white/40 shadow-[0_0_15px_rgba(255,255,255,0.2)]`}
            >
              <span className="text-white text-xl ml-1">▶</span>
            </motion.div>
          </div>
        )}

        {/* No image yet */}
        {!state?.reference_image_url && !(isPresent && originalImageUrl) && (
          <div className="absolute inset-0 flex items-center justify-center">
            {stage === "pending" && (
              <span className="text-zinc-600 text-2xl drop-shadow-md">⏸</span>
            )}
            {stage === "researching" && (
              <div
                className={`w-5 h-5 border-2 ${colors.border} border-t-transparent rounded-full animate-spin`}
              />
            )}
          </div>
        )}

        {/* Period badge */}
        <div className="absolute top-2 left-2 z-10">
          {isPast && (
            <span className="text-[9px] text-zinc-400 font-bold tracking-widest bg-black/50 px-1.5 py-0.5 rounded backdrop-blur-md border border-white/10 uppercase">◄ PAST</span>
          )}
          {!isPast && !isPresent && (
            <span className="text-[9px] text-zinc-400 font-bold tracking-widest bg-black/50 px-1.5 py-0.5 rounded backdrop-blur-md border border-white/10 uppercase">FUTURE ►</span>
          )}
          {isPresent && (
            <span className="text-[9px] bg-white text-black px-1.5 py-0.5 rounded font-black tracking-widest uppercase shadow-[0_0_10px_rgba(255,255,255,0.5)]">
              NOW
            </span>
          )}
        </div>
        
        {/* Glow overlay for selected state */}
        {isSelected && (
          <div className={`absolute inset-0 ${colors.bg} mix-blend-overlay opacity-20 pointer-events-none`} />
        )}
      </div>

      {/* Label */}
      <div className="p-3 pb-4">
        <div className={`text-sm font-black tracking-wide drop-shadow-sm ${colors.text}`}>
          {PERIOD_LABELS[period]}
        </div>
        <div className="text-[11px] text-zinc-400 mt-1 truncate font-medium tracking-wide">
          {STAGE_LABELS[stage]}
        </div>
      </div>

      {/* Active pulse bar */}
      {isActive && (
        <div className="absolute bottom-0 left-0 right-0 h-1 overflow-hidden">
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: "100%" }}
            transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
            className={`h-full w-full ${colors.bg} opacity-80`}
            style={{ background: "currentColor", boxShadow: "0 0 8px currentColor" }}
          />
        </div>
      )}
    </motion.button>
  );
}
