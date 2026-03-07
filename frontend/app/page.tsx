"use client";
import { useState, useCallback } from "react";
import { UploadZone } from "@/components/UploadZone";
import { LocationBadge } from "@/components/LocationBadge";
import { PeriodCard } from "@/components/PeriodCard";
import { VideoPlayer } from "@/components/VideoPlayer";
import { TimelineSlider } from "@/components/TimelineSlider";
import { useSessionSSE } from "@/lib/sse";
import { uploadImage, startProcessing } from "@/lib/api";
import { PERIODS, Period } from "@/lib/constants";

type AppState = "idle" | "uploading" | "processing";

export default function Home() {
  const [appState, setAppState] = useState<AppState>("idle");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [originalImageUrl, setOriginalImageUrl] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<Period>("present");
  const [error, setError] = useState<string | null>(null);

  const { periodStates, location } = useSessionSSE(sessionId);

  const completedCount = Object.values(periodStates).filter(
    (s) => s?.stage === "complete"
  ).length;

  const handleUpload = useCallback(async (file: File) => {
    try {
      setAppState("uploading");
      setError(null);
      const { session_id, original_image_url } = await uploadImage(file);
      setSessionId(session_id);
      setOriginalImageUrl(original_image_url);
      setAppState("processing");
      await startProcessing(session_id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setAppState("idle");
    }
  }, []);

  if (appState === "idle" || appState === "uploading") {
    return (
      <>
        {error && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-red-900/90 border border-red-700 text-red-200 px-4 py-2 rounded-lg z-50 text-sm">
            {error}
          </div>
        )}
        <UploadZone onUpload={handleUpload} isLoading={appState === "uploading"} />
      </>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 flex items-center justify-between px-6 py-3 border-b border-zinc-900 bg-zinc-950/90 backdrop-blur-md shrink-0">
        <h1 className="text-2xl font-black">
          Sing<span className="text-amber-400">Flix</span>
        </h1>

        <div className="flex-1 px-8">
          <LocationBadge location={location} />
        </div>

        <div className="flex items-center gap-4">
          {completedCount > 0 && (
            <span className="text-zinc-500 text-sm">{completedCount}/6 ready</span>
          )}
          <button
            onClick={() => {
              setAppState("idle");
              setSessionId(null);
              setOriginalImageUrl(null);
            }}
            className="text-zinc-500 hover:text-zinc-300 text-sm transition-colors"
          >
            ← New photo
          </button>
        </div>
      </header>

      {/* Main video player */}
      <div className="px-6 pt-4 shrink-0">
        <VideoPlayer
          period={selectedPeriod}
          state={periodStates[selectedPeriod]}
          originalImageUrl={originalImageUrl ?? undefined}
        />
      </div>

      {/* Timeline */}
      <div className="px-6">
        <TimelineSlider
          selected={selectedPeriod}
          periodStates={periodStates}
          onSelect={setSelectedPeriod}
        />
      </div>

      {/* Period cards */}
      <div className="grid grid-cols-6 gap-3 px-6 pb-6">
        {PERIODS.map((period) => (
          <PeriodCard
            key={period}
            period={period}
            state={periodStates[period]}
            isSelected={selectedPeriod === period}
            onClick={() => setSelectedPeriod(period)}
            originalImageUrl={originalImageUrl ?? undefined}
          />
        ))}
      </div>
    </main>
  );
}
