"use client";
import { Period, PERIODS, PERIOD_COLORS, PERIOD_LABELS } from "@/lib/constants";
import { PeriodStates } from "@/lib/sse";
import { motion } from "framer-motion";

interface Props {
  selected: Period;
  periodStates: PeriodStates;
  onSelect: (period: Period) => void;
}

export function TimelineSlider({ selected, periodStates, onSelect }: Props) {
  return (
    <div className="w-full px-4 py-8 relative">
      {/* Decorative background glow for timeline */}
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-8 bg-zinc-900/40 blur-xl pointer-events-none rounded-full" />

      {/* Instruction */}
      <p className="text-center text-zinc-500 text-[10px] uppercase font-black tracking-[0.3em] mb-6 drop-shadow-md">
        <span className="opacity-50">◄ PAST</span> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Slide through time &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; <span className="opacity-50">FUTURE ►</span>
      </p>

      {/* Timeline container */}
      <div className="relative flex items-center max-w-4xl mx-auto">
        {/* Connecting line */}
        <div className="absolute inset-x-8 top-1/2 -translate-y-px h-0.5 bg-zinc-800/80 rounded-full overflow-hidden shadow-[0_0_5px_rgba(255,255,255,0.05)]">
          {/* Animated progress line tracking the selected period could go here if we wanted */}
        </div>

        {/* Period stops */}
        {PERIODS.map((period) => {
          const colors = PERIOD_COLORS[period];
          const isSelected = selected === period;
          const state = periodStates[period];
          const isComplete = state?.stage === "complete";
          const isActive =
            state &&
            ["researching", "image_generating", "video_generating"].includes(
              state.stage
            );
          const isPresent = period === "present";

          return (
            <button
              key={period}
              onClick={() => onSelect(period)}
              className="relative flex-1 flex flex-col items-center gap-3 group py-2"
            >
              {/* Dot Container for alignment */}
              <div className="relative h-6 w-full flex justify-center items-center">
                {/* Active selection aura */}
                {isSelected && (
                  <motion.div
                    layoutId="timeline-active-glow"
                    className={`absolute w-12 h-12 rounded-full ${colors.bg} blur-xl opacity-30`}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}

                {/* Dot */}
                <motion.div
                  className={`
                    relative z-10 transition-colors duration-300 shadow-lg cursor-pointer
                    ${
                      isSelected
                        ? `w-5 h-5 rounded-full ${colors.border.replace("border-", "bg-")} border-[3px] border-black ring-2 ${colors.ring}`
                        : isComplete
                        ? `w-3 h-3 rounded-full border-2 ${colors.border} bg-zinc-900 group-hover:scale-125`
                        : isActive
                        ? `w-3 h-3 rounded-full border-2 ${colors.border} bg-zinc-950 animate-pulse group-hover:scale-125`
                        : "w-3 h-3 rounded-full border-2 border-zinc-700 bg-zinc-950 group-hover:scale-125 group-hover:border-zinc-500"
                    }
                    ${isPresent && !isSelected ? "w-4 h-4" : ""}
                  `}
                  whileHover={{ scale: isSelected ? 1.1 : 1.3 }}
                  style={{ 
                    boxShadow: isSelected ? `0 0 15px ${colors.bg.replace('bg-','')}` : 'none' 
                  }}
                />
              </div>

              {/* Label */}
              <span
                className={`
                  text-xs font-bold transition-all duration-300 whitespace-nowrap tracking-wide
                  ${
                    isSelected
                      ? `${colors.text} scale-110 drop-shadow-md`
                      : isComplete
                      ? "text-zinc-400 group-hover:text-zinc-300"
                      : "text-zinc-600 group-hover:text-zinc-400"
                  }
                  ${isPresent ? "font-black" : ""}
                `}
              >
                {PERIOD_LABELS[period]}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
