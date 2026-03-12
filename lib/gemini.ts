/**
 * Gemini API — suggest a label category for an email (Phase 5).
 * Uses gemini-2.5-flash (current GA model for Google AI API).
 */

import { CANNED_LABEL_CATEGORIES, type CannedCategoryKey } from "./label-categories";

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
  enabledCategoryKeys: CannedCategoryKey[];
  /** Recent user corrections: for similar emails, prefer the user's chosen category. */
  corrections?: LabelCorrection[];
};

/**
 * Returns the category_key (e.g. "newsletter") that best matches the email, or null.
 */
export async function suggestLabelForEmail(input: SuggestLabelInput): Promise<CannedCategoryKey | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const categoryList = input.enabledCategoryKeys.join(", ");
  const correctionsBlock =
    input.corrections && input.corrections.length > 0
      ? `Learn from these user corrections (for similar emails, prefer the user's chosen category):
${input.corrections
  .slice(0, 15)
  .map(
    (c) =>
      `- From: ${(c.from ?? "").slice(0, 80)} | Subject: ${(c.subject ?? "").slice(0, 60)} | Snippet: ${(c.snippet ?? "").slice(0, 100)}... → User chose "${c.chosenCategory}" (not "${c.suggestedCategory}").`
  )
  .join("\n")}

Now classify this email using the same categories. Prefer the user's past choices for similar content.

`
      : "";

  const prompt = `You are an email classifier. Given an email's sender, subject, and a short body snippet, choose exactly ONE of these categories: ${categoryList}.
${correctionsBlock}Email to classify:
From: ${input.from}
Subject: ${input.subject}
Snippet: ${input.snippet.slice(0, 500)}

Reply with only the single category key (one word, lowercase, from the list). If nothing fits well, reply with: priority`;

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
    console.error("[Gemini] API error:", res.status, res.statusText, JSON.stringify(raw, null, 2));
    return null;
  }

  const data = raw as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
    }>;
  };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim().toLowerCase();
  if (!text) {
    console.error("[Gemini] No category in response:", JSON.stringify(data, null, 2));
    return null;
  }

  const key = text.replace(/[^a-z_]/g, "") as CannedCategoryKey;
  if (input.enabledCategoryKeys.includes(key)) return key;
  return input.enabledCategoryKeys[0] ?? null;
}
