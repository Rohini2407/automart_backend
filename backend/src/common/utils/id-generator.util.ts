/**
 * sellerId format (unchanged from legacy): AM + initials of each word in
 * firstName (uppercase) + last 4 digits of phone.
 * e.g. "Rahul Kumar" / "9876543210" -> AMRK3210
 * Stored in `users.externalId`.
 */
export function generateSellerId(firstName: string, phone: string): string {
  const initials = firstName
    .trim()
    .split(/\s+/)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
  const last4 = phone.replace(/\D/g, "").slice(-4);
  return `AM${initials}${last4}`;
}
