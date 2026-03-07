export const PERIODS = ["1925", "1965", "1985", "present", "2040", "2070"] as const;
export type Period = (typeof PERIODS)[number];

export const PERIOD_LABELS: Record<Period, string> = {
  "1925": "1925",
  "1965": "1965",
  "1985": "1985",
  present: "Now",
  "2040": "2040",
  "2070": "2070",
};

export const PERIOD_COLORS: Record<
  Period,
  { text: string; border: string; bg: string; ring: string }
> = {
  "1925": {
    text: "text-amber-500",
    border: "border-amber-500",
    bg: "bg-amber-500/10",
    ring: "ring-amber-500/40",
  },
  "1965": {
    text: "text-amber-400",
    border: "border-amber-400",
    bg: "bg-amber-400/10",
    ring: "ring-amber-400/40",
  },
  "1985": {
    text: "text-yellow-300",
    border: "border-yellow-300",
    bg: "bg-yellow-300/10",
    ring: "ring-yellow-300/40",
  },
  present: {
    text: "text-white",
    border: "border-white",
    bg: "bg-white/10",
    ring: "ring-white/30",
  },
  "2040": {
    text: "text-cyan-400",
    border: "border-cyan-400",
    bg: "bg-cyan-400/10",
    ring: "ring-cyan-400/40",
  },
  "2070": {
    text: "text-blue-400",
    border: "border-blue-400",
    bg: "bg-blue-400/10",
    ring: "ring-blue-400/40",
  },
};

export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";
