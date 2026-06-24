// Displays a vocabulary image with a graceful fallback when the file is missing
// (the backend keeps serving rows even before the user adds art).
import { useState } from "react";

export default function ImageBox({ src, alt, className = "" }) {
  const [failed, setFailed] = useState(false);

  return (
    <div
      className={`flex items-center justify-center overflow-hidden rounded-2xl bg-slate-100 ring-1 ring-slate-200 ${className}`}
    >
      {failed || !src ? (
        <div className="flex flex-col items-center gap-1 p-4 text-center text-slate-400">
          <span className="text-3xl">🖼️</span>
          <span className="text-xs">{alt || "image"}</span>
        </div>
      ) : (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          className="h-full w-full object-contain"
        />
      )}
    </div>
  );
}
