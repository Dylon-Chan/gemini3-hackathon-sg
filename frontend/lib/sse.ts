"use client";
import { useEffect, useRef, useState } from "react";
import { API_BASE, Period } from "./constants";

export type PeriodStage =
  | "pending"
  | "researching"
  | "image_generating"
  | "video_generating"
  | "complete"
  | "error";

export interface PeriodState {
  period: Period;
  stage: PeriodStage;
  research_summary?: string;
  reference_image_url?: string;
  video_url?: string;
  error_message?: string;
}

export type PeriodStates = Partial<Record<Period, PeriodState>>;

export interface LocationInfo {
  location_name: string;
  coordinates: { lat: number; lng: number };
  confidence: number;
  neighborhood: string;
  landmark_type: string;
  description: string;
}

export function useSessionSSE(sessionId: string | null) {
  const [periodStates, setPeriodStates] = useState<PeriodStates>({});
  const [location, setLocation] = useState<LocationInfo | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!sessionId) return;

    const es = new EventSource(`${API_BASE}/api/events/${sessionId}`);
    esRef.current = es;

    es.addEventListener("period_update", (e: MessageEvent) => {
      const data: PeriodState = JSON.parse(e.data);
      setPeriodStates((prev) => ({ ...prev, [data.period]: data }));
    });

    es.addEventListener("location_identified", (e: MessageEvent) => {
      setLocation(JSON.parse(e.data));
    });

    es.addEventListener("session_complete", () => {
      setIsComplete(true);
      es.close();
    });

    es.onerror = () => {
      // Browser auto-reconnects
    };

    return () => {
      es.close();
      esRef.current = null;
    };
  }, [sessionId]);

  return { periodStates, location, isComplete };
}
