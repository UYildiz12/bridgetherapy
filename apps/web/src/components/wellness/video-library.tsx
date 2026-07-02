"use client";
import { useEffect, useState } from "react";
import { preconnect } from "react-dom";
import { Play, X } from "lucide-react";
import { VIDEO_CATEGORIES, type WellnessVideo } from "@/lib/wellness-content";

export function VideoLibrary() {
  const [active, setActive] = useState<WellnessVideo | null>(null);

  // Warm the thumbnail CDN connection before the grid of images hits it.
  preconnect("https://i.ytimg.com");

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActive(null);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [active]);

  return (
    <div className="grid gap-10">
      {VIDEO_CATEGORIES.map((cat) => (
        <section key={cat.key} className="grid gap-4">
          <div className="grid gap-1">
            <h2 className="text-xl">{cat.title}</h2>
            <p className="max-w-prose text-sm text-muted-foreground">{cat.blurb}</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cat.videos.map((video) => (
              <button
                key={video.id}
                type="button"
                onClick={() => setActive(video)}
                className="group grid gap-2.5 text-left outline-none"
              >
                <div className="relative aspect-video overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`https://i.ytimg.com/vi/${video.youtubeId}/hqdefault.jpg`}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover opacity-85 transition duration-300 group-hover:scale-[1.03] group-hover:opacity-100 group-focus-visible:opacity-100"
                  />
                  <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/70 via-transparent to-transparent" />
                  <span className="pointer-events-none absolute left-1/2 top-1/2 flex size-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-background/70 text-foreground backdrop-blur-sm transition group-hover:scale-110 group-hover:bg-background/85">
                    <Play size={18} strokeWidth={2} className="ml-0.5" aria-hidden />
                  </span>
                  <span className="pointer-events-none absolute bottom-2 right-2 rounded-full bg-background/80 px-2 py-0.5 text-xs tabular-nums text-foreground backdrop-blur-sm">
                    {video.minutes} min
                  </span>
                </div>
                <div className="grid gap-0.5">
                  <span className="text-sm font-medium leading-snug text-foreground group-hover:underline">
                    {video.title}
                  </span>
                  {video.source && (
                    <span className="text-xs text-muted-foreground">{video.source}</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </section>
      ))}

      {active && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={active.title}
          onClick={() => setActive(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-3xl overflow-hidden rounded-2xl border border-white/12 bg-card shadow-[0_24px_60px_-12px_rgb(0_0_0/0.7)]"
          >
            <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{active.title}</p>
                {active.source && (
                  <p className="truncate text-xs text-muted-foreground">{active.source}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setActive(null)}
                aria-label="Close video"
                className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-foreground"
              >
                <X size={16} aria-hidden />
              </button>
            </div>
            <div className="aspect-video w-full bg-black">
              <iframe
                key={active.youtubeId}
                src={`https://www.youtube-nocookie.com/embed/${active.youtubeId}?autoplay=1&rel=0`}
                title={active.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="h-full w-full"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
