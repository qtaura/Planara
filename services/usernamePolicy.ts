// Username policy: normalize and block slurs and reserved/impersonation names
// Drug-related words are explicitly allowed

import fs from 'fs';

const BASE_RESERVED = [
  // impersonation / staff / official service names
  'admin',
  'administrator',
  'moderator',
  'mod',
  'support',
  'help',
  'helpdesk',
  'planara',
  'staff',
  'team',
  'owner',
  'official',
  'service',
  'services',
  'system',
  // roles and common deceptive variants
  'sysop',
  'root',
  'superuser',
  'sudo',
  'operator',
  'ops',
];

const BASE_SLURS = [
  // Racial/homophobic slurs — keep minimal and focused; not exhaustive
  'nigger',
  'nigga',
  'faggot',
  'fag',
  'tranny',
  'retard',
  'retarded',
];

function readReservedFromEnv(): string[] {
  const envList = String(process.env.RESERVED_USERNAMES || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const filePath = process.env.RESERVED_USERNAMES_FILE;
  const fileList: string[] = [];
  if (filePath) {
    try {
      const text = fs.readFileSync(filePath, 'utf8');
      // Support JSON array or newline-separated file
      if (text.trim().startsWith('[')) {
        const arr = JSON.parse(text);
        if (Array.isArray(arr)) {
          for (const v of arr) {
            if (typeof v === 'string' && v.trim()) fileList.push(v.trim());
          }
        }
      } else {
        for (const line of text.split(/\r?\n/)) {
          const s = line.trim();
          if (s) fileList.push(s);
        }
      }
    } catch {}
  }
  const merged = [...envList, ...fileList];
  // Deduplicate case-insensitively
  const seen = new Set<string>();
  const out: string[] = [];
  for (const w of merged) {
    const key = w.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      out.push(w);
    }
  }
  return out;
}

export function normalizeUsernameForPolicy(raw: string): string {
  const s = String(raw || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '') // strip diacritics
    .replace(/[_\-\.\s]+/g, '') // collapse common separators
    .replace(/[^a-z0-9]/g, ''); // remove non-alphanumerics
  return s;
}

function includesAny(base: string, words: string[]): boolean {
  return words.some((w) => base.includes(w));
}

function getReservedTokensNormalized(): string[] {
  const extra = readReservedFromEnv();
  const norm = (arr: string[]) => arr.map((w) => normalizeUsernameForPolicy(w)).filter(Boolean);
  // Combine base + extra; normalize and dedupe
  const combined = [...norm(BASE_RESERVED), ...norm(extra)];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const w of combined) {
    if (!seen.has(w)) {
      seen.add(w);
      out.push(w);
    }
  }
  return out;
}

function getSlurTokensNormalized(): string[] {
  return BASE_SLURS.map((w) => normalizeUsernameForPolicy(w)).filter(Boolean);
}

export function isUsernameDisallowed(raw: string): boolean {
  const n = normalizeUsernameForPolicy(raw);
  if (!n) return true; // empty-like after normalization
  // Drugs words are allowed explicitly — do not block
  // Check slurs or reserved impersonation tokens
  if (includesAny(n, getSlurTokensNormalized())) return true;
  if (includesAny(n, getReservedTokensNormalized())) return true;
  return false;
}

export function disallowedReason(raw: string): string | null {
  const n = normalizeUsernameForPolicy(raw);
  if (!n) return 'empty username';
  if (includesAny(n, getSlurTokensNormalized())) return 'contains offensive language';
  if (includesAny(n, getReservedTokensNormalized()))
    return 'impersonates staff or official service';
  return null;
}

export const USERNAME_ALLOWED_REGEX = /^[A-Za-z0-9_]{3,20}$/;

export function isUsernameFormatValid(raw: string): boolean {
  if (!raw) return false;
  return USERNAME_ALLOWED_REGEX.test(raw);
}

export function sanitizeUsernameToAllowed(raw: string): string {
  if (!raw) return '';
  // Replace any disallowed character with underscore
  let s = raw.replace(/[^A-Za-z0-9_]/g, '_');
  // Collapse multiple underscores
  s = s.replace(/_+/g, '_');
  // Trim underscores at edges
  s = s.replace(/^_+/, '').replace(/_+$/, '');
  // Enforce max length 20
  if (s.length > 20) s = s.slice(0, 20);
  // Ensure minimum length 3 by padding underscores if needed
  while (s.length < 3) s = s + '_';
  return s;
}