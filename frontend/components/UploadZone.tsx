"use client";
import { useCallback, useState } from "react";
import { motion } from "framer-motion";

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
    <div className="flex flex-col items-center justify-center min-h-screen animated-bg p-8 relative overflow-hidden">
      {/* Decorative gradient orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-[128px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-[128px] pointer-events-none" />

      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="mb-12 text-center relative z-10"
      >
        <h1 className="text-7xl font-black tracking-tight text-white mb-4 drop-shadow-2xl">
          Sing<span className="bg-clip-text text-transparent bg-gradient-to-r from-amber-400 to-amber-600">Flix</span>
        </h1>
        <p className="text-zinc-300 text-xl font-light tracking-wide">
          Upload a Singapore photo. Travel through time.
        </p>
        <p className="text-zinc-500 text-sm mt-3 tracking-widest uppercase opacity-80">
          AI-powered · 1925 → Now → 2070
        </p>
      </motion.div>

      {/* Drop zone */}
      <motion.label
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
        className={`
          relative cursor-pointer rounded-3xl p-1
          w-full max-w-2xl aspect-video flex flex-col items-center justify-center gap-6
          transition-all duration-500 glass-panel shadow-2xl z-10
          ${
            isDragging
              ? "scale-[1.02] bg-zinc-900/60"
              : "hover:bg-zinc-900/50 hover:shadow-amber-500/10"
          }
          ${isLoading ? "opacity-50 pointer-events-none scale-95" : ""}
        `}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        {/* Animated border gradient container */}
        <div className={`absolute inset-0 rounded-3xl border-2 transition-colors duration-500 ${isDragging ? "border-amber-400" : "border-zinc-700/50 hover:border-zinc-500/50"}`} />

        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileInput}
          disabled={isLoading}
        />
        {isLoading ? (
           <motion.div
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             className="flex flex-col items-center gap-4"
           >
             <div className="w-16 h-16 border-4 border-amber-500/30 border-t-amber-400 rounded-full animate-spin shadow-[0_0_15px_rgba(251,191,36,0.3)]" />
             <p className="text-zinc-300 text-lg font-medium tracking-wide">Initiating time travel...</p>
           </motion.div>
        ) : (
          <motion.div
            className="flex flex-col items-center gap-4"
            animate={{ scale: isDragging ? 1.05 : 1 }}
          >
            <div className="text-7xl drop-shadow-lg">🎬</div>
            <p className="text-zinc-200 text-2xl font-medium tracking-tight">
              {isDragging ? "Drop to transport" : "Drop a Singapore photo here"}
            </p>
            <p className="text-zinc-400 text-sm font-light">
              or click to browse — JPG, PNG, WEBP
            </p>
          </motion.div>
        )}
      </motion.label>

      {/* Suggestions */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 0.6 }}
        className="mt-12 flex flex-wrap gap-3 justify-center max-w-2xl relative z-10"
      >
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
            className="text-xs font-medium text-zinc-400 bg-zinc-900/50 border border-zinc-800/80 px-4 py-2 rounded-full backdrop-blur-md hover:bg-zinc-800 hover:text-zinc-200 transition-colors cursor-default"
          >
            {place}
          </span>
        ))}
      </motion.div>
    </div>
  );
}
