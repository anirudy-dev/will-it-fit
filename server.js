import express from "express";
import { createServer } from "http";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import Anthropic from "@anthropic-ai/sdk";

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json({ limit: "1mb" }));

// Serve Vite build
app.use(express.static(join(__dirname, "dist")));

// Anthropic proxy endpoint
app.post("/api/claude", async (req, res) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "ANTHROPIC_API_KEY not configured" });
  }

  const client = new Anthropic({ apiKey });

  try {
    const { model, max_tokens, system, tools, messages } = req.body;
    const response = await client.messages.create({
      model,
      max_tokens,
      system,
      tools,
      messages,
    });
    res.json(response);
  } catch (err) {
    console.error("Anthropic error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// SPA fallback
app.get("*", (_req, res) => {
  res.sendFile(join(__dirname, "dist", "index.html"));
});

const PORT = process.env.PORT || 3000;
createServer(app).listen(PORT, () => {
  console.log(`Will it Fit? server running on port ${PORT}`);
});
