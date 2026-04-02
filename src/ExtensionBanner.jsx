// ExtensionBanner.jsx
// Drop this file into your existing web app's src/ folder.
//
// Usage — add it just below your <nav> in App.jsx:
//   import ExtensionBanner from "./ExtensionBanner";
//   ...
//   <nav>...</nav>
//   <ExtensionBanner />
//
// Replace CHROME_STORE_URL with your actual store listing URL once published.

const CHROME_STORE_URL = "https://chromewebstore.google.com/detail/will-it-fit/YOUR_EXTENSION_ID";

// Detect if the user already has the extension installed.
// The extension injects a tiny marker into the page via the content script.
// Add this to content.js: document.documentElement.dataset.wifExtension = "1";
const hasExtension = () =>
  typeof document !== "undefined" &&
  document.documentElement.dataset.wifExtension === "1";

export default function ExtensionBanner() {
  // Don't show the banner if the extension is already installed
  if (hasExtension()) return null;

  return (
    <div
      style={{
        background: "linear-gradient(90deg, #1E3A5F 0%, #1E4D8C 100%)",
        color: "#fff",
        padding: "10px 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        flexWrap: "wrap",
        fontSize: 13,
      }}
    >
      {/* Chrome icon */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="rgba(255,255,255,0.8)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <circle cx="12" cy="12" r="4" />
          <line x1="21.17" y1="8" x2="12" y2="8" />
          <line x1="3.95" y1="6.06" x2="8.54" y2="14" />
          <line x1="10.88" y1="21.94" x2="15.46" y2="14" />
        </svg>
        <span style={{ fontWeight: 700, opacity: 0.95 }}>
          Now available as a Chrome extension
        </span>
      </div>

      <span style={{ opacity: 0.7, display: "flex", alignItems: "center", gap: 6 }}>
        <span
          style={{
            background: "rgba(255,255,255,0.12)",
            borderRadius: 99,
            padding: "2px 8px",
            fontSize: 11,
            fontWeight: 600,
          }}
        >
          NEW
        </span>
        Auto-detects dimensions on any product page — no URL pasting
      </span>

      <a
        href={CHROME_STORE_URL}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          background: "#fff",
          color: "#1E3A5F",
          fontWeight: 700,
          fontSize: 13,
          padding: "7px 16px",
          borderRadius: 8,
          textDecoration: "none",
          display: "flex",
          alignItems: "center",
          gap: 6,
          flexShrink: 0,
          transition: "opacity .15s",
          whiteSpace: "nowrap",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.88")}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        Add to Chrome — Free
      </a>

      {/* Dismiss button — uses sessionStorage so it doesn't reappear this session */}
      <button
        onClick={(e) => {
          e.currentTarget.closest("[data-wif-banner]").style.display = "none";
          try { sessionStorage.setItem("wif-banner-dismissed", "1"); } catch {}
        }}
        style={{
          background: "none",
          border: "none",
          color: "rgba(255,255,255,0.5)",
          cursor: "pointer",
          fontSize: 18,
          lineHeight: 1,
          padding: "0 4px",
          flexShrink: 0,
        }}
        aria-label="Dismiss"
        title="Dismiss"
      >
        ×
      </button>

      {/* Script to check session dismissal */}
      <script
        dangerouslySetInnerHTML={{
          __html: `(function(){try{if(sessionStorage.getItem('wif-banner-dismissed')==='1'){var b=document.querySelector('[data-wif-banner]');if(b)b.style.display='none';}}catch(e){}})();`,
        }}
      />
    </div>
  );
}
