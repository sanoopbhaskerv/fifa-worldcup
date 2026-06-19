/**
 * Google Gemini AI Studio adapter for the fantasy prediction game.
 *
 * Implements two generation surfaces:
 *   - geminiGenerateHostMessage  — REMINDER, RECAP, LEADERBOARD_SUMMARY copy
 *   - geminiGenerateQuestionDrafts — match poll question drafts
 *
 * Both functions are server-side only. API keys never reach browser assets.
 *
 * Env vars consumed via aiProviderConfig() in fantasy-game.mjs:
 *   FANTASY_AI_PROVIDER=gemini
 *   FANTASY_AI_API_KEY=<Google AI Studio key>
 *   FANTASY_AI_MODEL=gemini-2.0-flash          (or any Gemini model name)
 *   FANTASY_AI_MAX_OUTPUT_TOKENS=300
 *   FANTASY_AI_ESTIMATED_COST_CENTS=0          (Gemini free tier = 0)
 *   FANTASY_AI_DAILY_CALL_LIMIT=20
 */

import { ProviderError } from "../errors.mjs";

const GEMINI_BASE_URL =
  "https://generativelanguage.googleapis.com/v1beta/models";

const GEMINI_REQUEST_TIMEOUT_MS = 8_000;

/**
 * Makes one call to the Gemini generateContent endpoint and returns the raw
 * text from the first candidate part.
 *
 * @param {string} model     - Gemini model name, e.g. "gemini-2.0-flash"
 * @param {string} apiKey    - Google AI Studio API key
 * @param {string} systemPrompt
 * @param {string} userContent
 * @param {{ maxOutputTokens?: number, temperature?: number }} options
 * @returns {Promise<string>} Raw JSON text from Gemini
 */
const callGemini = async (
  model,
  apiKey,
  systemPrompt,
  userContent,
  { maxOutputTokens = 300, temperature = 0.7, responseSchema } = {},
) => {
  const url = `${GEMINI_BASE_URL}/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GEMINI_REQUEST_TIMEOUT_MS);

  let response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: "user", parts: [{ text: userContent }] }],
        generationConfig: {
          responseMimeType: "application/json",
          ...(responseSchema ? { responseSchema } : {}),
          maxOutputTokens,
          temperature,
        },
      }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const message =
      payload?.error?.message ?? `Gemini API error ${response.status}.`;
    console.error("[Gemini] API error:", response.status, message);
    throw new ProviderError(`Gemini: ${message}`, 502, "GEMINI_API_FAILED");
  }

  const payload = await response.json();

  // Gemini 2.5 Flash with thinking mode may include thought parts before the
  // actual response. Find the first non-thought part that has text.
  const parts = payload?.candidates?.[0]?.content?.parts ?? [];
  const text = parts.find((p) => !p.thought && p.text)?.text ?? parts[0]?.text ?? "";

  console.log("[Gemini] raw text preview:", String(text).slice(0, 200));

  if (!text) {
    const finishReason = payload?.candidates?.[0]?.finishReason ?? "UNKNOWN";
    throw new ProviderError(
      `Gemini returned no content (finishReason: ${finishReason}).`,
      502,
      "GEMINI_NO_CONTENT",
    );
  }

  return text;
};

// ---------------------------------------------------------------------------
// Host message generation (REMINDER / RECAP / LEADERBOARD_SUMMARY)
// ---------------------------------------------------------------------------

// Explicit response schema forces Gemini to return structured JSON.
// Gemini REST API uses lowercase OpenAPI schema types.
const HOST_MESSAGE_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string" },
    body: { type: "string" },
  },
  required: ["title", "body"],
};

// Extracts the first JSON object from a string — handles markdown code fences
// and any preamble text that thinking models sometimes prepend.
const extractJson = (text) => {
  const str = String(text);
  // Try extracting from inside a code fence first (```json ... ``` or ``` ... ```)
  const fenceMatch = str.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
  if (fenceMatch) return JSON.parse(fenceMatch[1]);
  // Fall back to first { ... } in the text
  const match = str.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("No JSON object found in Gemini response.");
  return JSON.parse(match[0]);
};

const hostMessageSystemPrompt = (settings = {}) =>
  [
    "You are a fantasy football host message generator.",
    "OUTPUT RULES: Return ONLY a raw JSON object. No explanation. No code fences. No markdown. No preamble. No text before or after the JSON.",
    "The JSON must have exactly two string fields: title (max 80 chars) and body (max 200 chars).",
    "Keep the message factual and under 45 body words.",
    "Do not invent scores, player names, injuries, or events not present in the provided context.",
    `Banter level: ${settings.banterLevel ?? "LIGHT"}.`,
    'Example output: {"title":"Match Reminder","body":"Polls close soon. Submit your predictions now."}',
  ].join(" ");

/**
 * Generates a REMINDER, RECAP, or LEADERBOARD_SUMMARY host message via Gemini.
 *
 * @param {"REMINDER"|"RECAP"|"LEADERBOARD_SUMMARY"} type
 * @param {object} context   - Template context built by aiMessageContextFor()
 * @param {{ apiKey: string, model: string, maxOutputTokens: number }} config
 * @param {object} settings  - aiSettings from game state (banterLevel etc.)
 * @returns {Promise<{ title: string, body: string }>}
 */
export const geminiGenerateHostMessage = async (
  type,
  context,
  config,
  settings = {},
) => {
  const { apiKey, model, maxOutputTokens } = config;
  const temperature = settings.banterLevel === "NONE" ? 0.2 : 0.7;

  const text = await callGemini(
    model,
    apiKey,
    hostMessageSystemPrompt(settings),
    JSON.stringify({ type, context }),
    {
      maxOutputTokens: Math.max(maxOutputTokens ?? 500, 500),
      temperature,
      // responseSchema omitted intentionally — it causes intermittent 400 errors
      // from Gemini 2.5 Flash. System prompt + responseMimeType is sufficient.
    },
  );

  let parsed;
  try {
    // Try strict parse first; fall back to JSON extraction for thinking-mode responses
    parsed = JSON.parse(text);
  } catch {
    try {
      parsed = extractJson(text);
    } catch {
      const err = new ProviderError("Gemini host message response is not valid JSON.", 502, "GEMINI_PARSE_FAILED");
      throw err;
    }
  }

  const title = String(parsed.title ?? "").trim();
  const body = String(parsed.body ?? "").trim();

  if (!title || !body) {
    const err = new Error("Gemini host message response missing title or body.");
    err.code = "GEMINI_INVALID_SHAPE";
    throw err;
  }

  return { title: title.slice(0, 120), body: body.slice(0, 500) };
};

// ---------------------------------------------------------------------------
// Poll question draft generation
// ---------------------------------------------------------------------------

const ALLOWED_CATEGORIES = [
  "MATCH_WINNER",
  "FIRST_SCORER",
  "BOTH_TEAMS_SCORE",
  "TOTAL_GOALS",
  "CORRECT_SCORE",
  "YELLOW_CARDS",
];

const ALLOWED_TYPES = ["SINGLE_CHOICE", "EXACT_SCORE"];

const POINTS_GUIDE = {
  MATCH_WINNER: 5,
  FIRST_SCORER: 10,
  BOTH_TEAMS_SCORE: 5,
  TOTAL_GOALS: 8,
  CORRECT_SCORE: 15,
  YELLOW_CARDS: 5,
};

const questionDraftSystemPrompt = () =>
  [
    "You generate football prediction poll questions for a private friends league.",
    "Return only a JSON array of question draft objects.",
    "Each object must have: text (string), category (one of the allowed categories),",
    "type (one of the allowed types), options (string array, 2–6 items), points (integer).",
    "For EXACT_SCORE type, options should be ['0-0','1-0','0-1','2-0','0-2','2-1','1-2','1-1','2-2','Other'].",
    "Use ONLY the player names from squadCandidates for any player options.",
    "Never invent player names, scores, or events.",
    "Keep question text short and clear for mobile (under 10 words).",
    "Do not repeat categories. Honour the maxQuestions limit.",
  ].join(" ");

/**
 * Uses Gemini to generate poll question drafts for a single match.
 *
 * Returns an array of raw draft objects; the caller is responsible for
 * validation against stored squad data via validateQuestionDraft().
 *
 * @param {object} match            - Normalized match record
 * @param {string[]} squadCandidates - Player name strings for option grounding
 * @param {number} maxQuestions
 * @param {{ apiKey: string, model: string, maxOutputTokens: number }} config
 * @param {object} settings         - aiSettings
 * @returns {Promise<Array<{ text, category, type, options, points }>>}
 */
export const geminiGenerateQuestionDrafts = async (
  match,
  squadCandidates,
  maxQuestions,
  config,
  settings = {},
) => {
  const { apiKey, model, maxOutputTokens } = config;

  const userContent = JSON.stringify({
    match: {
      id: match.id,
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      kickoff: match.kickoff,
      stage: match.stage ?? "Group",
      importance: match.importance ?? "NORMAL",
    },
    squadCandidates: squadCandidates.slice(0, 40), // compact context
    maxQuestions,
    allowedCategories: ALLOWED_CATEGORIES,
    allowedTypes: ALLOWED_TYPES,
    pointsGuide: POINTS_GUIDE,
    extraOptions: ["No goal", "Own goal", "Other"],
  });

  const text = await callGemini(
    model,
    apiKey,
    questionDraftSystemPrompt(),
    userContent,
    {
      // Question drafts need more tokens than host messages
      maxOutputTokens: Math.max((maxOutputTokens ?? 300) * 2, 600),
      temperature: 0.4, // lower for more deterministic structure
    },
  );

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    const err = new Error("Gemini question draft response is not valid JSON.");
    err.code = "GEMINI_PARSE_FAILED";
    throw err;
  }

  if (!Array.isArray(parsed)) {
    const err = new Error("Gemini question draft response is not an array.");
    err.code = "GEMINI_INVALID_SHAPE";
    throw err;
  }

  // Basic shape validation — full squad validation happens in the caller
  return parsed
    .filter(
      (q) =>
        q &&
        typeof q.text === "string" &&
        ALLOWED_CATEGORIES.includes(q.category) &&
        ALLOWED_TYPES.includes(q.type) &&
        Array.isArray(q.options) &&
        q.options.length >= 2,
    )
    .slice(0, maxQuestions);
};
