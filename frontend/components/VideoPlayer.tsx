"use client";
import { useRef, useEffect } from "react";
import { Period, PERIOD_COLORS, PERIOD_LABELS } from "@/lib/constants";
import { PeriodState } from "@/lib/sse";
import { API_BASE } from "@/lib/constants";
import { motion, AnimatePresence } from "framer-motion";

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
    <motion.div
      layoutId="main-video-player"
      className={`relative w-full aspect-video rounded-3xl overflow-hidden border border-zinc-800/50 bg-black shadow-2xl transition-colors duration-700`}
      style={{
        boxShadow: state?.video_url || state?.reference_image_url || isPresent
          ? `0 0 60px -15px ${colors.bg.replace('bg-', '')}` // Approximate glow color
          : 'none'
      }}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={period}
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="w-full h-full absolute inset-0"
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
                className="w-full h-full object-cover opacity-70 blur-sm scale-105"
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/50 backdrop-blur-md">
                <div
                  className={`w-14 h-14 border-4 ${colors.border} border-t-transparent rounded-full animate-spin shadow-[0_0_20px_currentColor]`}
                />
                <p className={`${colors.text} text-lg font-medium tracking-wide drop-shadow-lg`}>
                  Generating cinematic video...
                </p>
                <div className="w-48 h-1.5 bg-zinc-800 rounded-full overflow-hidden mt-2">
                  <motion.div 
                    initial={{ x: "-100%" }}
                    animate={{ x: "100%" }}
                    transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                    className={`h-full w-full ${colors.bg}`} 
                  />
                </div>
              </div>
            </>
          )}

          {/* Loading state */}
          {!state?.reference_image_url && !state?.video_url && !isPresent && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-zinc-950/80">
              <div
                className={`w-12 h-12 border-4 ${colors.border} border-t-transparent rounded-full animate-spin opacity-50`}
              />
              <p className="text-zinc-500 text-base font-light tracking-wider uppercase">
                {state?.stage === "researching" ? "AI Researching era details..." : "Waiting..."}
              </p>
            </div>
          )}

          {/* Error state */}
          {state?.stage === "error" && (
            <div className="absolute inset-0 flex items-center justify-center bg-red-950/80 border-2 border-red-800/80 backdrop-blur-lg">
              <div className="text-center px-8 flex flex-col items-center">
                <div className="w-16 h-16 bg-red-900/50 rounded-full flex items-center justify-center mb-4">
                  <span className="text-red-400 text-3xl">⚠️</span>
                </div>
                <p className="text-red-400 text-lg font-bold tracking-wide">Generation Disrupted</p>
                <p className="text-red-500/80 text-sm mt-2 font-mono bg-black/40 p-2 rounded">{state.error_message}</p>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Persistent cinematic overlay & Year */}
      <div className="absolute inset-0 pointer-events-none rounded-3xl border border-white/5 z-20" />
      <div className="absolute bottom-0 left-0 right-0 p-8 pt-24 bg-gradient-to-t from-black via-black/60 to-transparent pointer-events-none z-10 transition-colors duration-500">
        <motion.span 
          key={`label-${period}`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`text-6xl font-black ${colors.text} drop-shadow-2xl tracking-tighter`}
        >
          {PERIOD_LABELS[period]}
        </motion.span>
        {state?.research_summary && (
          <motion.p 
            key={`summary-${period}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-zinc-300 font-light text-sm mt-3 line-clamp-2 max-w-3xl leading-relaxed drop-shadow-md backdrop-blur-sm bg-black/20 p-2 rounded-lg"
          >
            {state.research_summary}
          </motion.p>
        )}
      </div>
    </motion.div>
  );
}
