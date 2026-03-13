/**
 * Email GPS + DRIP Matrix (Dan Martell "Buy Back Your Time").
 * - GPS: one primary label per email (where it goes).
 * - DRIP: secondary label for value/energy (Delegate, Replace, Invest, Produce).
 */

export const EMAIL_GPS_CATEGORIES = [
  {
    key: "action-required",
    name: "@Action-Required",
    type: "gps" as const,
    description: "Only you can handle. High-stakes decisions, personal relationships, signed approvals.",
  },
  {
    key: "to-respond",
    name: "@To-Respond",
    type: "gps" as const,
    description: "Needs a reply; assistant drafted it. Review and send.",
  },
  {
    key: "responded",
    name: "@Responded",
    type: "gps" as const,
    description: "Already replied (on your behalf). Reference/audit only.",
  },
  {
    key: "waiting-on",
    name: "@Waiting-On",
    type: "gps" as const,
    description: "Reply sent; awaiting response. Flag if no reply after 48h.",
  },
  {
    key: "financials",
    name: "@Financials",
    type: "gps" as const,
    description: "Invoices, receipts, billing, payment confirmations.",
  },
  {
    key: "newsletters",
    name: "@Newsletters",
    type: "gps" as const,
    description: "Contains unsubscribe link. Low priority; batch weekly.",
  },
  {
    key: "fyi",
    name: "@FYI",
    type: "gps" as const,
    description: "Informational only. CC'd emails, internal notifications, status updates.",
  },
] as const;

export const DRIP_CATEGORIES = [
  {
    key: "drip-delegate",
    name: "DRIP:Delegate",
    type: "drip" as const,
    description: "Low value + low energy. Routine, repetitive. Auto-handle or ignore.",
  },
  {
    key: "drip-replace",
    name: "DRIP:Replace",
    type: "drip" as const,
    description: "High value + low energy. Important but draining. Delegate to a system.",
  },
  {
    key: "drip-invest",
    name: "DRIP:Invest",
    type: "drip" as const,
    description: "Low value + high energy. Interesting but not urgent. Batch review.",
  },
  {
    key: "drip-produce",
    name: "DRIP:Produce",
    type: "drip" as const,
    description: "High value + high energy. Strategic, revenue, relationships. Prioritize now.",
  },
] as const;

/** All categories: 7 GPS + 4 DRIP (for settings and user_label_categories). */
export const CANNED_LABEL_CATEGORIES = [...EMAIL_GPS_CATEGORIES, ...DRIP_CATEGORIES] as const;

export type GpsCategoryKey = (typeof EMAIL_GPS_CATEGORIES)[number]["key"];
export type DripCategoryKey = (typeof DRIP_CATEGORIES)[number]["key"];
export type CannedCategoryKey = (typeof CANNED_LABEL_CATEGORIES)[number]["key"];

export const GPS_KEYS: GpsCategoryKey[] = EMAIL_GPS_CATEGORIES.map((c) => c.key);
export const DRIP_KEYS: DripCategoryKey[] = DRIP_CATEGORIES.map((c) => c.key);

export const ACTION_REQUIRED_KEY: GpsCategoryKey = "action-required";

export function getCannedCategory(key: string) {
  return CANNED_LABEL_CATEGORIES.find((c) => c.key === key);
}

export function getGpsCategory(key: string) {
  return EMAIL_GPS_CATEGORIES.find((c) => c.key === key);
}

export function getDripCategory(key: string) {
  return DRIP_CATEGORIES.find((c) => c.key === key);
}
