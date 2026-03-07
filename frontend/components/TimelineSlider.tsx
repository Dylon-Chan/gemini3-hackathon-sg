"use client";
import { Period, PERIODS, PERIOD_COLORS, PERIOD_LABELS } from "@/lib/constants";
import { PeriodStates } from "@/lib/sse";

interface Props {
  selected: Period;
  periodStates: PeriodStates;
  onSelect: (period: Period) => void;
}

export function TimelineSlider({ selected, periodStates, onSelect }: Props) {
  return (
    <div className="w-full px-4 py-4">
      {/* Instruction */}
      <p className="text-center text-zinc-600 text-xs mb-4">
        ◄ PAST &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Slide through time &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; FUTURE ►
      </p>

      {/* Timeline */}
      <div className="relative flex items-center">
        {/* Connecting line */}
        <div className="absolute inset-x-0 top-1/2 -translate-y-[7px] h-px bg-zinc-800" />

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
              className="relative flex-1 flex flex-col items-center gap-2 group py-2"
            >
              {/* Dot */}
              <div
                className={`
                  relative z-10 transition-all duration-300
                  ${
                    isSelected
                      ? `w-5 h-5 rounded-full ${colors.border.replace("border-", "bg-")} border-2 ${colors.border} ring-4 ${colors.ring}`
                      : isComplete
                      ? `w-3 h-3 rounded-full border-2 ${colors.border} bg-zinc-900`
                      : isActive
                      ? `w-3 h-3 rounded-full border-2 ${colors.border} bg-zinc-950 animate-pulse`
                      : "w-3 h-3 rounded-full border-2 border-zinc-700 bg-zinc-950"
                  }
                  ${isPresent && !isSelected ? "w-4 h-4" : ""}
                `}
              />

              {/* Label */}
              <span
                className={`
                  text-xs font-bold transition-colors duration-300 whitespace-nowrap
                  ${
                    isSelected
                      ? colors.text
                      : isComplete
                      ? "text-zinc-400"
                      : "text-zinc-600"
                  }
                  ${isPresent ? "font-black text-sm" : ""}
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
