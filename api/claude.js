import Anthropic from "@anthropic-ai/sdk";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

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
      ...(system   && { system }),
      ...(tools    && { tools }),
      messages,
    });
    res.json(response);
  } catch (err) {
    console.error("Anthropic error:", err.message);
    res.status(500).json({ error: err.message });
  }
}
