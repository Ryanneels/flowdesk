/**
 * Anthropic Claude — Email GPS + DRIP classification + draft reply generation.
 * Calls the Anthropic API directly via fetch (no SDK install required).
 */

import {
  type DripCategoryKey,
  type GpsCategoryKey,
  GPS_KEYS,
  DRIP_KEYS,
  ACTION_REQUIRED_KEY,
} from "./label-categories";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-4-20250514";

export type LabelCorrection = {
  from: string;
  subject: string;
  snippet: string;
  suggestedCategory: string;
  chosenCategory: string;
};

export type ClassifyEmailInput = {
  from: string;
  subject: string;
  body: string;
  enabledGpsKeys: GpsCategoryKey[];
  enabledDripKeys: DripCategoryKey[];
  corrections?: LabelCorrection[];
};

export type ClassifyEmailResult = {
  gps: GpsCategoryKey;
  drip: DripCategoryKey;
  summary: string;
  needsReply: boolean;
  draftReply: string | null;
};

/** Rule-based overrides — checked before calling Claude. */
function ruleBasedGps(from: string, subject: string, body: string): GpsCategoryKey | null {
  const combined = `${from} ${subject} ${body}`.toLowerCase();
  if (/\bunsubscribe\b/.test(combined)) return "newsletters";
  if (/\b(invoice|receipt|payment|billing|paid\s|confirmation\s*#|order\s*#)\b/.test(combined))
    return "financials";
  if (
    /(noreply|no-reply|donotreply|do-not-reply|notifications?@|mailer-daemon@)/.test(
      from.toLowerCase()
    )
  )
    return "fyi";
  return null;
}

async function callClaude(prompt: string, maxTokens = 1500): Promise<string | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.warn("[Claude] ANTHROPIC_API_KEY not set — skipping AI call");
    return null;
  }

  const res = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("[Claude] API error:", res.status, text);
    return null;
  }

  const data = (await res.json()) as {
    content?: Array<{ type: string; text?: string }>;
  };
  return data.content?.[0]?.text?.trim() ?? null;
}

/**
 * Classify an email with Email GPS + DRIP Matrix and generate a draft reply.
 * Returns null only on hard failure; falls back gracefully on missing API key.
 */
export async function classifyAndDraftEmail(
  input: ClassifyEmailInput
): Promise<ClassifyEmailResult | null> {
  const ruleGps = ruleBasedGps(input.from, input.subject, input.body);
  const enabledGps = input.enabledGpsKeys.length
    ? input.enabledGpsKeys
    : (GPS_KEYS as GpsCategoryKey[]);
  const enabledDrip = input.enabledDripKeys.length
    ? input.enabledDripKeys
    : (DRIP_KEYS as DripCategoryKey[]);

  const fallback: ClassifyEmailResult = {
    gps: ruleGps ?? enabledGps[0] ?? ACTION_REQUIRED_KEY,
    drip: enabledDrip[0] ?? "drip-delegate",
    summary: (input.subject || "(no subject)").slice(0, 100),
    needsReply: false,
    draftReply: null,
  };

  if (!process.env.ANTHROPIC_API_KEY) return fallback;

  const correctionsBlock =
    input.corrections && input.corrections.length > 0
      ? `\nLearn from these past corrections (prefer the user's chosen label for similar emails):\n${input.corrections
          .slice(0, 10)
          .map(
            (c) =>
              `- From: ${c.from.slice(0, 60)} | Subject: ${c.subject.slice(0, 50)} → User chose "${c.chosenCategory}" (AI said "${c.suggestedCategory}")`
          )
          .join("\n")}\n`
      : "";

  const prompt = `You are an executive assistant managing email for a busy CEO using Dan Martell's "Buy Back Your Time" Email GPS system and DRIP Matrix.

Analyze this email and return a JSON object. Return ONLY raw JSON — no markdown fences, no explanation.

EMAIL GPS LABELS (pick exactly one):
- action-required: Only the CEO can handle. High-stakes: key relationships, contracts, approvals, strategic decisions.
- to-respond: Needs a reply but is routine enough to draft. Generate the draft.
- financials: Invoice, receipt, billing, payment, subscription charge.
- newsletters: Has an unsubscribe link OR is clearly marketing/newsletter content.
- fyi: Informational only — CC'd, status updates, automated notifications. No action needed.
- waiting-on: Already replied, waiting for a response (don't assign to new incoming emails).
- responded: Already handled (don't assign to new incoming emails).

DRIP MATRIX (pick exactly one):
- drip-produce: High value + high importance. Prioritize immediately.
- drip-replace: High value but draining/routine. Should be systematized.
- drip-invest: Low immediate value but worth engaging (relationship-building, learning).
- drip-delegate: Low value, routine, repetitive. Auto-handle or ignore.

PRIORITY RULES (apply in order):
1. Paying customer, board member, key partner → action-required + drip-produce
2. Invoice/receipt/billing keywords → financials (rule already applied if present)
3. "Unsubscribe" anywhere → newsletters (rule already applied if present)
4. no-reply/automated sender → fyi (rule already applied if present)
5. Cold sales outreach → newsletters or fyi + drip-delegate
6. Routine reply needed → to-respond + drip-replace or drip-delegate
${correctionsBlock}
JSON format (return exactly this shape):
{
  "gps": "<gps label>",
  "drip": "<drip label>",
  "summary": "<one sentence, max 12 words describing what this email is about>",
  "needs_reply": <true|false>,
  "draft_reply": "<concise reply in CEO voice if needs_reply is true, otherwise null>"
}

Draft reply guidelines (if needs_reply is true):
- CEO style: direct, concise, no filler phrases ("Hope this finds you well", etc.)
- Match the formality level of the original email
- Include a subject line as the first line: "Subject: Re: [original subject]" then a blank line
- Sign off with just the CEO's first name or initials

EMAIL:
From: ${input.from}
Subject: ${input.subject}
Body:
${input.body.slice(0, 3000)}`;

  const raw = await callClaude(prompt, 1500);
  if (!raw) return fallback;

  try {
    const cleaned = raw
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
    const parsed = JSON.parse(cleaned) as {
      gps?: string;
      drip?: string;
      summary?: string;
      needs_reply?: boolean;
      draft_reply?: string | null;
    };

    // Rule-based GPS always wins over AI
    const gps: GpsCategoryKey =
      ruleGps ??
      (enabledGps.includes(parsed.gps as GpsCategoryKey)
        ? (parsed.gps as GpsCategoryKey)
        : enabledGps[0] ?? ACTION_REQUIRED_KEY);

    const drip: DripCategoryKey = enabledDrip.includes(parsed.drip as DripCategoryKey)
      ? (parsed.drip as DripCategoryKey)
      : enabledDrip[0] ?? "drip-delegate";

    return {
      gps,
      drip,
      summary: (parsed.summary ?? input.subject ?? "(no subject)").slice(0, 200),
      needsReply: parsed.needs_reply ?? false,
      draftReply: parsed.draft_reply ?? null,
    };
  } catch (e) {
    console.error("[Claude] JSON parse failed:", e, "\nRaw output:", raw);
    return fallback;
  }
}
