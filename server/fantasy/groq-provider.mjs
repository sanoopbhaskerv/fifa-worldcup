/**
 * Groq AI adapter for the fantasy prediction game.
 *
 * Groq exposes an OpenAI-compatible chat completions endpoint, so this is a
 * thin wrapper — no custom JSON extraction needed.
 *
 * Used as a fallback when the primary provider (Gemini) fails.
 *
 * Env vars consumed via aiProviderConfig() in fantasy-game.mjs:
 *   FANTASY_AI_FALLBACK_API_KEY=<Groq API key from console.groq.com>
 *   FANTASY_AI_FALLBACK_MODEL=llama-3.3-70b-versatile
 */

import { ProviderError } from "../errors.mjs";

const GROQ_CHAT_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_REQUEST_TIMEOUT_MS = 8_000;

const systemPrompt = (settings = {}) =>
  [
    "You are a fantasy football host message generator.",
    "Return ONLY a raw JSON object with exactly two string fields: title (max 80 chars) and body (max 200 chars).",
    "Keep the message factual and under 45 body words.",
    "Do not invent scores, player names, or events not in the provided context.",
    `Banter level: ${settings.banterLevel ?? "LIGHT"}.`,
    'Example: {"title":"Match Reminder","body":"Polls close soon. Submit your predictions now."}',
  ].join(" ");

/**
 * Generates a host message (REMINDER / RECAP / LEADERBOARD_SUMMARY) via Groq.
 *
 * @param {"REMINDER"|"RECAP"|"LEADERBOARD_SUMMARY"} type
 * @param {object} context   - Template context from aiMessageContextFor()
 * @param {{ apiKey: string, model: string, maxOutputTokens: number }} config
 * @param {object} settings  - aiSettings from game state
 * @returns {Promise<{ title: string, body: string }>}
 */
export const groqGenerateHostMessage = async (type, context, config, settings = {}) => {
  const { fallbackApiKey, fallbackModel, maxOutputTokens } = config;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GROQ_REQUEST_TIMEOUT_MS);

  let response;
  try {
    response = await fetch(GROQ_CHAT_URL, {
      method: "POST",
      headers: {
        "authorization": `Bearer ${fallbackApiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: fallbackModel,
        messages: [
          { role: "system", content: systemPrompt(settings) },
          { role: "user", content: JSON.stringify({ type, context }) },
        ],
        max_tokens: Math.max(maxOutputTokens ?? 300, 300),
        temperature: settings.banterLevel === "NONE" ? 0.2 : 0.7,
        response_format: { type: "json_object" },
      }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const message = payload?.error?.message ?? `Groq API error ${response.status}.`;
    console.error("[Groq] API error:", response.status, message);
    throw new ProviderError(`Groq: ${message}`, 502, "GROQ_API_FAILED");
  }

  const payload = await response.json();
  const content = payload?.choices?.[0]?.message?.content ?? "";

  let parsed;
  try {
    const jsonText = String(content).match(/\{[\s\S]*\}/)?.[0] ?? content;
    parsed = JSON.parse(jsonText);
  } catch {
    throw new ProviderError("Groq response is not valid JSON.", 502, "GROQ_PARSE_FAILED");
  }

  const title = String(parsed.title ?? "").trim();
  const body = String(parsed.body ?? "").trim();

  if (!title || !body) {
    throw new ProviderError("Groq response missing title or body.", 502, "GROQ_INVALID_SHAPE");
  }

  return { title: title.slice(0, 120), body: body.slice(0, 500) };
};
