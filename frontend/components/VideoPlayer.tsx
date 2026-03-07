"use client";
import { useRef, useEffect } from "react";
import { Period, PERIOD_COLORS, PERIOD_LABELS } from "@/lib/constants";
import { PeriodState } from "@/lib/sse";
import { API_BASE } from "@/lib/constants";

interface Props {
  period: Period;
  state?: PeriodState;
  originalImageUrl?: string;
}

export function VideoPlayer({ period, state, originalImageUrl }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const colors = PERIOD_COLORS[period];
  const isPresent = period === "present";

  useEffect(() => {
    if (videoRef.current && state?.video_url) {
      videoRef.current.load();
      videoRef.current.play().catch(() => {});
    }
  }, [state?.video_url]);

  return (
    <div
      className={`relative w-full aspect-video rounded-2xl overflow-hidden border-2 ${colors.border} bg-zinc-950`}
    >
      {/* Present state: show uploaded image */}
      {isPresent && originalImageUrl && !state?.video_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`${API_BASE}${originalImageUrl}`}
          alt="Current location"
          className="w-full h-full object-cover"
        />
      )}

      {/* Generated video */}
      {state?.video_url && (
        <video
          ref={videoRef}
          src={`${API_BASE}${state.video_url}`}
          className="w-full h-full object-cover"
          autoPlay
          loop
          muted
          playsInline
        />
      )}

      {/* Reference image while video generates */}
      {!state?.video_url && state?.reference_image_url && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`${API_BASE}${state.reference_image_url}`}
            alt={`${period} reference`}
            className="w-full h-full object-cover opacity-60"
          />
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/40">
            <div
              className={`w-10 h-10 border-2 ${colors.border} border-t-transparent rounded-full animate-spin`}
            />
            <p className={`${colors.text} text-sm font-medium`}>
              Generating video...
            </p>
          </div>
        </>
      )}

      {/* Loading state */}
      {!state?.reference_image_url && !state?.video_url && !isPresent && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
          <div
            className={`w-10 h-10 border-2 ${colors.border} border-t-transparent rounded-full animate-spin opacity-50`}
          />
          <p className="text-zinc-600 text-sm">
            {state?.stage === "researching" ? "Researching..." : "Waiting..."}
          </p>
        </div>
      )}

      {/* Year overlay */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
        <span className={`text-4xl font-black ${colors.text} drop-shadow-lg`}>
          {PERIOD_LABELS[period]}
        </span>
        {state?.research_summary && (
          <p className="text-white/60 text-xs mt-1 line-clamp-2 max-w-2xl">
            {state.research_summary}
          </p>
        )}
      </div>

      {/* Error state */}
      {state?.stage === "error" && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-950/60 border-2 border-red-800">
          <div className="text-center px-8">
            <p className="text-red-400 text-sm font-medium">Generation failed</p>
            <p className="text-red-600 text-xs mt-1">{state.error_message}</p>
          </div>
        </div>
      )}
    </div>
  );
}
