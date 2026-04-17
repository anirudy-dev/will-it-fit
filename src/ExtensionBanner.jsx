// ExtensionBanner.jsx
// Drop into your web app's src/ folder.
//
// Usage — add just below <nav> in App.jsx:
//   import ExtensionBanner from "./ExtensionBanner";
//   <nav>...</nav>
//   <ExtensionBanner />
//
// Replace CHROME_STORE_URL with your actual Chrome Web Store listing URL.

import { useState } from "react";

const CHROME_STORE_URL = "https://chromewebstore.google.com/detail/will-it-fit/YOUR_EXTENSION_ID";

// Detect if the user already has the extension installed.
// The extension injects a tiny marker via the content script.
// Add this line to your extension's content.js:
//   document.documentElement.dataset.wifExtension = "1";
const hasExtension = () =>
  typeof document !== "undefined" &&
  document.documentElement.dataset.wifExtension === "1";

export default function ExtensionBanner() {
  const [dismissed, setDismissed] = useState(
    () => sessionStorage.getItem("wif_banner_dismissed") === "1"
  );

  if (hasExtension() || dismissed) return null;

  const dismiss = () => {
    sessionStorage.setItem("wif_banner_dismissed", "1");
    setDismissed(true);
  };

  return (
    <div style={{
      background: "linear-gradient(90deg, #1E3A5F 0%, #1E4D8C 100%)",
      color: "#fff",
      padding: "9px 20px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 14,
      flexWrap: "wrap",
      fontSize: 13,
      position: "relative",
    }}>
      {/* Chrome icon + headline */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none"
          stroke="rgba(255,255,255,0.85)" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <circle cx="12" cy="12" r="4"/>
          <line x1="21.17" y1="8" x2="12" y2="8"/>
          <line x1="3.95" y1="6.06" x2="8.54" y2="14"/>
          <line x1="10.88" y1="21.94" x2="15.46" y2="14"/>
        </svg>
        <span style={{ fontWeight: 700, opacity: 0.95 }}>
          Chrome extension available — check dimensions directly on IKEA product pages
        </span>
      </div>

      {/* Geo notice */}
      <span style={{
        fontSize: 11,
        fontWeight: 600,
        opacity: 0.85,
        background: "rgba(255,255,255,0.12)",
        border: "1px solid rgba(255,255,255,0.2)",
        borderRadius: 99,
        padding: "2px 9px",
        flexShrink: 0,
        letterSpacing: "0.02em",
      }}>
        🇨🇦 🇺🇸 Canada & US only
      </span>

      {/* CTA */}
      <a
        href={CHROME_STORE_URL}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          background: "#fff",
          color: "#1E3A5F",
          fontWeight: 700,
          fontSize: 12,
          borderRadius: 7,
          padding: "6px 14px",
          textDecoration: "none",
          flexShrink: 0,
          letterSpacing: "0.01em",
          whiteSpace: "nowrap",
        }}
      >
        Add to Chrome — Free →
      </a>

      {/* Dismiss */}
      <button
        onClick={dismiss}
        aria-label="Dismiss banner"
        style={{
          position: "absolute",
          right: 14,
          top: "50%",
          transform: "translateY(-50%)",
          background: "none",
          border: "none",
          color: "rgba(255,255,255,0.55)",
          fontSize: 17,
          cursor: "pointer",
          lineHeight: 1,
          padding: "2px 4px",
          fontFamily: "inherit",
        }}
      >
        ✕
      </button>
    </div>
  );
}
