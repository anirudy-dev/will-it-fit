import express from 'express'
import { createServer } from 'http'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()

app.use(express.json({ limit: '2mb' }))

// ── Serve Vite build ────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'dist')))

// ── Anthropic API proxy ─────────────────────────────────────────────────────
// Keeps the API key server-side; the browser never sees it.
app.post('/api/claude', async (req, res) => {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not set on server' })
  }

  try {
    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'web-search-2025-03-05',
      },
      body: JSON.stringify(req.body),
    })

    const data = await upstream.json()
    res.status(upstream.status).json(data)
  } catch (err) {
    console.error('Proxy error:', err)
    res.status(502).json({ error: 'Failed to reach Anthropic API', detail: err.message })
  }
})

// ── SPA fallback ────────────────────────────────────────────────────────────
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'))
})

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`✅ Will It Fit? server running on port ${PORT}`)
})
