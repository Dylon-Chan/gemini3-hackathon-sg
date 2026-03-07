"use client";
import { useCallback, useState } from "react";

interface Props {
  onUpload: (file: File) => void;
  isLoading?: boolean;
}

export function UploadZone({ onUpload, isLoading }: Props) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith("image/")) onUpload(file);
    },
    [onUpload]
  );

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onUpload(file);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-950 p-8">
      {/* Logo */}
      <div className="mb-12 text-center">
        <h1 className="text-7xl font-black tracking-tight text-white mb-3">
          Sing<span className="text-amber-400">Flix</span>
        </h1>
        <p className="text-zinc-400 text-xl">
          Upload a Singapore photo. Travel through time.
        </p>
        <p className="text-zinc-600 text-sm mt-2">
          AI-powered · 1925 → Now → 2070
        </p>
      </div>

      {/* Drop zone */}
      <label
        className={`
          relative cursor-pointer border-2 border-dashed rounded-2xl
          w-full max-w-2xl aspect-video flex flex-col items-center justify-center gap-4
          transition-all duration-300
          ${
            isDragging
              ? "border-amber-400 bg-amber-400/5 scale-[1.02]"
              : "border-zinc-700 hover:border-zinc-500 bg-zinc-900"
          }
          ${isLoading ? "opacity-50 pointer-events-none" : ""}
        `}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileInput}
          disabled={isLoading}
        />
        {isLoading ? (
          <>
            <div className="w-12 h-12 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
            <p className="text-zinc-400 text-lg">Uploading...</p>
          </>
        ) : (
          <>
            <div className="text-6xl">🎬</div>
            <p className="text-zinc-300 text-xl font-medium">
              Drop a Singapore photo here
            </p>
            <p className="text-zinc-500 text-sm">
              or click to browse — JPG, PNG, WEBP
            </p>
          </>
        )}
      </label>

      {/* Suggestions */}
      <div className="mt-8 flex flex-wrap gap-2 justify-center max-w-xl">
        {[
          "Marina Bay Sands",
          "Raffles Hotel",
          "Chinatown",
          "Orchard Road",
          "Gardens by the Bay",
          "Old Airport Road",
        ].map((place) => (
          <span
            key={place}
            className="text-xs text-zinc-600 border border-zinc-800 px-2 py-1 rounded-full"
          >
            {place}
          </span>
        ))}
      </div>
    </div>
  );
}
