import { useState, useRef, useEffect, useCallback } from "react";

/* ─── helpers ─────────────────────────────────────────────────────────────── */
const range = (s, e) => Array.from({ length: e - s + 1 }, (_, i) => s + i);
