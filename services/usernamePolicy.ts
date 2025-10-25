// Username policy: normalize and block slurs and reserved/impersonation names
// Drug-related words are explicitly allowed

const RESERVED = [
  // impersonation / staff / official service names
  "admin", "administrator", "moderator", "mod", "support", "help", "helpdesk", "planara", "staff", "team", "owner", "official", "service", "services", "system",
  // roles and common deceptive variants
  "sysop", "root", "superuser", "sudo", "operator", "ops",
];

const SLURS = [
  // Racial/homophobic slurs — keep minimal and focused; not exhaustive
  "nigger", "nigga", "faggot", "fag", "tranny", "retard", "retarded",
];

// Normalize username for policy checks: lowercase, remove diacritics, collapse symbols
export function normalizeUsernameForPolicy(raw: string): string {
  const s = String(raw || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // strip diacritics
    .replace(/[_\-\.\s]+/g, "") // collapse common separators
    .replace(/[^a-z0-9]/g, ""); // remove non-alphanumerics
  return s;
}

function includesAny(base: string, words: string[]): boolean {
  return words.some(w => base.includes(w));
}

export function isUsernameDisallowed(raw: string): boolean {
  const n = normalizeUsernameForPolicy(raw);
  if (!n) return true; // empty-like after normalization
  // Drugs words are allowed explicitly — do not block
  // Check slurs or reserved impersonation tokens
  if (includesAny(n, SLURS)) return true;
  if (includesAny(n, RESERVED)) return true;
  return false;
}

export function disallowedReason(raw: string): string | null {
  const n = normalizeUsernameForPolicy(raw);
  if (!n) return "empty username";
  if (includesAny(n, SLURS)) return "contains offensive language";
  if (includesAny(n, RESERVED)) return "impersonates staff or official service";
  return null;
}