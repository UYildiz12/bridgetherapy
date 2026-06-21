"use client";
import { useEffect, useState } from "react";

const DISMISS_KEY = "exhale-ios-install-dismissed";

/**
 * iOS Safari doesn't show an install prompt — users must tap Share → Add to
 * Home Screen. This shows a small one-time hint to iOS Safari visitors who
 * haven't already installed the app.
 */
export function IosInstallHint() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const ua = window.navigator.userAgent;
    const isIos = /iphone|ipad|ipod/i.test(ua);
    const isSafari = isIos && /safari/i.test(ua) && !/crios|fxios|edgios/i.test(ua);
    const standalone =
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true ||
      window.matchMedia("(display-mode: standalone)").matches;
    const dismissed = window.localStorage.getItem(DISMISS_KEY) === "1";
    if (isSafari && !standalone && !dismissed) setShow(true);
  }, []);

  if (!show) return null;

  function dismiss() {
    window.localStorage.setItem(DISMISS_KEY, "1");
    setShow(false);
  }

  return (
    <div
      role="dialog"
      aria-label="Install Exhale"
      style={{
        position: "fixed",
        left: 16,
        right: 16,
        bottom: 16,
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "12px 14px",
        borderRadius: 14,
        background: "#171820",
        border: "1px solid rgba(245,244,239,0.14)",
        color: "#f1f0eb",
        boxShadow: "0 18px 40px rgba(0,0,0,0.45)",
        font: "14px/1.4 var(--font-instrument-sans), sans-serif",
      }}
    >
      <span style={{ flex: 1 }}>
        Install Exhale: tap <strong>Share</strong> then <strong>Add to Home Screen</strong>.
      </span>
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        style={{
          background: "transparent",
          border: "none",
          color: "rgba(245,244,239,0.65)",
          fontSize: 20,
          lineHeight: 1,
          cursor: "pointer",
          padding: 4,
        }}
      >
        ×
      </button>
    </div>
  );
}
