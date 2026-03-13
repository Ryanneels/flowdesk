/**
 * Gemini API — Suggest Email GPS + DRIP labels (Dan Martell "Buy Back Your Time").
 * Returns one GPS label + one DRIP label per email. Uses rule-based overrides then AI.
 */

import {
  type DripCategoryKey,
  type GpsCategoryKey,
  GPS_KEYS,
  DRIP_KEYS,
  ACTION_REQUIRED_KEY,
} from "./label-categories";

const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

export type LabelCorrection = {
  from: string;
  subject: string;
  snippet: string;
  suggestedCategory: string;
  chosenCategory: string;
};

export type SuggestLabelInput = {
  from: string;
  subject: string;
  snippet: string;
  /** Only GPS keys that are enabled and mapped. */
  enabledGpsKeys: GpsCategoryKey[];
  /** Only DRIP keys that are enabled and mapped. */
  enabledDripKeys: DripCategoryKey[];
  /** Past user corrections (GPS only for now). Prefer user's chosen GPS for similar emails. */
  corrections?: LabelCorrection[];
};

export type SuggestLabelResult = {
  gps: GpsCategoryKey;
  drip: DripCategoryKey;
};

/** Rule-based overrides (priority order). Returns gps if matched, else null. */
function ruleBasedGps(from: string, subject: string, snippet: string): GpsCategoryKey | null {
  const combined = `${from} ${subject} ${snippet}`.toLowerCase();
  if (/\bunsubscribe\b/.test(combined)) return "newsletters";
  if (
    /\b(invoice|receipt|payment|billing|paid\s|confirmation\s*#|order\s*#)\b/.test(combined)
  )
    return "financials";
  if (
    /(noreply|no-reply|donotreply|do-not-reply|notifications?@|mailer-daemon@)/.test(from.toLowerCase())
  )
    return "fyi";
  return null;
}

/**
 * Returns { gps, drip } for the email. Uses rules first, then Gemini.
 */
export async function suggestLabelForEmail(
  input: SuggestLabelInput
): Promise<SuggestLabelResult | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  const enabledGps = input.enabledGpsKeys.length ? input.enabledGpsKeys : (GPS_KEYS as unknown as GpsCategoryKey[]);
  const enabledDrip = input.enabledDripKeys.length ? input.enabledDripKeys : (DRIP_KEYS as unknown as DripCategoryKey[]);

  const ruleGps = ruleBasedGps(input.from, input.subject, input.snippet);

  if (!apiKey) {
    return {
      gps: ruleGps ?? enabledGps[0] ?? (ACTION_REQUIRED_KEY as GpsCategoryKey),
      drip: enabledDrip[0] ?? "drip-delegate",
    };
  }

  const correctionsBlock =
    input.corrections && input.corrections.length > 0
      ? `Learn from these user corrections (prefer the user's chosen GPS for similar emails):
${input.corrections
  .slice(0, 12)
  .map(
    (c) =>
      `- From: ${(c.from ?? "").slice(0, 60)} | Subject: ${(c.subject ?? "").slice(0, 50)} → User chose "${c.chosenCategory}" (not "${c.suggestedCategory}").`
  )
  .join("\n")}

`
      : "";

  const gpsList = enabledGps.join(", ");
  const dripList = enabledDrip.join(", ");

  const prompt = `You are an email classifier using the "Buy Back Your Time" Email GPS and DRIP Matrix.

PRIORITY RULES (apply in order):
1. Paying customer or key stakeholder → GPS: action-required, DRIP: drip-produce
2. Invoice/receipt/billing/payment keywords → GPS: financials (already handled by rules if present)
3. "Unsubscribe" in body/headers → GPS: newsletters (already handled by rules if present)
4. Automated/no-reply sender → GPS: fyi or newsletters
5. Cold outreach or sales emails → DRIP: drip-delegate, lowest priority
6. Email requiring a decision over a significant $ amount or contract → GPS: action-required, DRIP: drip-produce
7. Needs only a quick reply (and could be drafted) → GPS: to-respond
8. Already replied / thread closed → GPS: responded or waiting-on
9. Informational, CC'd, status update → GPS: fyi
10. Marketing, digests, subscriptions → GPS: newsletters

EMAIL GPS (choose exactly one): ${gpsList}
- action-required: Only the user can handle; high-stakes decisions, relationships, approvals
- to-respond: Needs reply; assistant drafted it; user reviews and sends
- responded: Already replied (reference only)
- waiting-on: Reply sent; awaiting response
- financials: Invoices, receipts, billing, payments
- newsletters: Has unsubscribe; batch weekly
- fyi: Informational; no action

DRIP (choose exactly one): ${dripList}
- drip-delegate: Low value + low energy. Routine; auto-handle or ignore
- drip-replace: High value + low energy. Delegate to system
- drip-invest: Low value + high energy. Batch review later
- drip-produce: High value + high energy. Prioritize immediately

${correctionsBlock}Email to classify:
From: ${input.from}
Subject: ${input.subject}
Snippet: ${input.snippet.slice(0, 500)}

Reply with exactly two words (GPS then DRIP), separated by a comma and space. Example: action-required, drip-produce
Use only the category keys from the lists above.`;

  const res = await fetch(GEMINI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        maxOutputTokens: 128,
        temperature: 0.2,
      },
    }),
  });

  const raw = (await res.json()) as Record<string, unknown>;
  if (!res.ok) {
    console.error("[Gemini] API error:", res.status, JSON.stringify(raw, null, 2));
    return {
      gps: ruleGps ?? enabledGps[0] ?? ACTION_REQUIRED_KEY,
      drip: enabledDrip[0] ?? "drip-delegate",
    };
  }

  const data = raw as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim().toLowerCase() ?? "";
  const [gpsPart, dripPart] = text.split(/[\s,]+/).map((s) => s.replace(/[^a-z-]/g, ""));
  let gps: GpsCategoryKey = enabledGps[0] ?? ACTION_REQUIRED_KEY;
  let drip: DripCategoryKey = enabledDrip[0] ?? "drip-delegate";
  if (enabledGps.includes(gpsPart as GpsCategoryKey)) gps = gpsPart as GpsCategoryKey;
  if (enabledDrip.includes(dripPart as DripCategoryKey)) drip = dripPart as DripCategoryKey;
  if (ruleGps) gps = ruleGps;

  return { gps, drip };
}
