/**
 * Canned label categories for AI email labeling (Phase 5).
 * User can enable/disable each and map to their Gmail labels.
 */

export const CANNED_LABEL_CATEGORIES = [
  { key: "priority", name: "Priority", description: "Emails needing action" },
  { key: "newsletter", name: "Newsletter", description: "Subscriptions and digests" },
  { key: "finance", name: "Finance", description: "Invoices, receipts, banks" },
  { key: "personal", name: "Personal", description: "Friends and family" },
  { key: "work", name: "Work", description: "Professional correspondence" },
  { key: "promotions", name: "Promotions", description: "Deals and offers" },
  { key: "notifications", name: "Notifications", description: "Automated system emails" },
] as const;

export type CannedCategoryKey = (typeof CANNED_LABEL_CATEGORIES)[number]["key"];

export function getCannedCategory(key: string) {
  return CANNED_LABEL_CATEGORIES.find((c) => c.key === key);
}
