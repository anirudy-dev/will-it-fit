# Will It Fit? 🚗📦

> Check if IKEA or Canadian Tire items fit in your car boot before you drive to the store.

Paste a product URL → select your car → see a live 3D boot view with boxes packed inside.

## Supported stores
- **IKEA Canada** (`ikea.com/ca/en/...`)
- **Canadian Tire** (`canadiantire.ca/...`)

## Tech stack
- React 18 + Vite (frontend)
- Express (API proxy — keeps your Anthropic key server-side)
- Claude Haiku + web_search tool (dimension fetching)
- 3D bin-packing with Extreme Points algorithm

## Local development

```bash
# 1. Install dependencies
npm install

# 2. Set your Anthropic API key
echo "ANTHROPIC_API_KEY=sk-ant-..." > .env

# 3. Start the Express proxy server (port 3001)
npm run dev:server

# 4. In another terminal, start Vite (port 5173)
npm run dev:client
```

Open http://localhost:5173

## Deploying to Render

1. Push this repo to GitHub
2. Go to [render.com](https://render.com) → New → Web Service → connect your repo
3. Render auto-detects `render.yaml` — click **Create**
4. In **Environment** tab, add `ANTHROPIC_API_KEY=sk-ant-...`
5. Deploy 🚀

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | ✅ | Your Anthropic API key |
| `PORT` | auto | Set by Render automatically |
