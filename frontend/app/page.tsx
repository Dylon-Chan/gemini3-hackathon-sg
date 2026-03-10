"use client";
import { useState, useCallback, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { UploadZone } from "@/components/UploadZone";
import { LocationBadge } from "@/components/LocationBadge";
import { PeriodCard } from "@/components/PeriodCard";
import { VideoPlayer } from "@/components/VideoPlayer";
import { TimelineSlider } from "@/components/TimelineSlider";
import { useSessionSSE } from "@/lib/sse";
import { uploadImage, startProcessing, fetchSession } from "@/lib/api";
import { PERIODS, Period } from "@/lib/constants";

type AppState = "idle" | "uploading" | "processing";

function SingFlixApp() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [appState, setAppState] = useState<AppState>("idle");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [originalImageUrl, setOriginalImageUrl] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<Period>("present");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const { periodStates, location } = useSessionSSE(sessionId);

  const completedCount = Object.values(periodStates).filter(
    (s) => s?.stage === "complete"
  ).length;

  // Restore session from ?session=<id> on page load
  useEffect(() => {
    const id = searchParams.get("session");
    if (!id) return;
    fetchSession(id)
      .then((snap) => {
        setSessionId(snap.session_id);
        setOriginalImageUrl(snap.original_image_url);
        setAppState("processing");
      })
      .catch(() => {
        // Session not found (backend may have restarted) — show upload
        router.replace("/");
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep ?session= in sync with URL whenever sessionId changes
  useEffect(() => {
    if (sessionId) {
      router.replace(`/?session=${sessionId}`, { scroll: false });
    }
  }, [sessionId, router]);

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

  const handleReset = useCallback(() => {
    setAppState("idle");
    setSessionId(null);
    setOriginalImageUrl(null);
    router.replace("/");
  }, [router]);

  const copySessionId = useCallback(() => {
    if (!sessionId) return;
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [sessionId]);

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
        <h1 className="text-2xl font-black shrink-0">
          Sing<span className="text-amber-400">Flix</span>
        </h1>

        <div className="flex-1 px-8 min-w-0">
          <LocationBadge location={location} />
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {completedCount > 0 && (
            <span className="text-zinc-500 text-sm">{completedCount}/6 ready</span>
          )}

          {/* Session ID chip — click to copy shareable URL */}
          {sessionId && (
            <button
              onClick={copySessionId}
              title="Copy shareable URL"
              className="flex items-center gap-1.5 text-xs font-mono bg-zinc-900 border border-zinc-700 hover:border-zinc-500 text-zinc-400 hover:text-zinc-200 px-2 py-1 rounded-md transition-colors"
            >
              <span>{copied ? "✓ Copied!" : `#${sessionId.slice(0, 8)}`}</span>
              {!copied && (
                <svg className="w-3 h-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              )}
            </button>
          )}

          <button
            onClick={handleReset}
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

// useSearchParams requires Suspense boundary
export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-zinc-950" />}>
      <SingFlixApp />
    </Suspense>
  );
}
