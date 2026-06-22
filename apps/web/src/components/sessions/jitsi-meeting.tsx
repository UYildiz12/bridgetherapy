"use client";
import { useEffect, useRef, useState } from "react";
import { JITSI_DOMAIN } from "@/lib/video";

type JitsiApi = { dispose: () => void };

declare global {
  interface Window {
    JitsiMeetExternalAPI?: new (
      domain: string,
      options: {
        roomName: string;
        parentNode: HTMLElement;
        width: string;
        height: string;
        userInfo?: { displayName?: string; email?: string };
        configOverwrite?: Record<string, unknown>;
        interfaceConfigOverwrite?: Record<string, unknown>;
      },
    ) => JitsiApi;
  }
}

function loadJitsiScript() {
  const existing = document.getElementById("jitsi-external-api");
  if (existing) {
    return existing.hasAttribute("data-loaded")
      ? Promise.resolve()
      : new Promise<void>((resolve, reject) => {
          existing.addEventListener("load", () => resolve(), { once: true });
          existing.addEventListener("error", () => reject(new Error("Jitsi failed to load.")), { once: true });
        });
  }

  return new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.id = "jitsi-external-api";
    script.src = `https://${JITSI_DOMAIN}/external_api.js`;
    script.async = true;
    script.addEventListener(
      "load",
      () => {
        script.setAttribute("data-loaded", "true");
        resolve();
      },
      { once: true },
    );
    script.addEventListener("error", () => reject(new Error("Jitsi failed to load.")), { once: true });
    document.body.appendChild(script);
  });
}

export function JitsiMeeting({
  roomId,
  displayName,
  email,
}: {
  roomId: string;
  displayName: string;
  email: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<JitsiApi | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    loadJitsiScript()
      .then(() => {
        if (cancelled || !containerRef.current || !window.JitsiMeetExternalAPI) return;
        apiRef.current?.dispose();
        apiRef.current = new window.JitsiMeetExternalAPI(JITSI_DOMAIN, {
          roomName: roomId,
          parentNode: containerRef.current,
          width: "100%",
          height: "100%",
          userInfo: { displayName, email },
          configOverwrite: {
            prejoinPageEnabled: true,
            startWithAudioMuted: true,
            startWithVideoMuted: false,
          },
          interfaceConfigOverwrite: {
            SHOW_JITSI_WATERMARK: false,
          },
        });
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Video room failed to load.");
      });

    return () => {
      cancelled = true;
      apiRef.current?.dispose();
      apiRef.current = null;
    };
  }, [displayName, email, roomId]);

  return (
    <div className="overflow-hidden border border-border bg-background">
      <div ref={containerRef} className="min-h-[28rem] w-full">
        {error ? (
          <div className="flex min-h-[28rem] items-center justify-center p-6 text-center text-sm text-destructive">
            {error}
          </div>
        ) : (
          <div className="flex min-h-[28rem] items-center justify-center p-6 text-sm text-muted-foreground">
            Loading video room...
          </div>
        )}
      </div>
    </div>
  );
}
