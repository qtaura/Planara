export type FeatureFlags = {
  realtimeEnabled: boolean;
  searchEnabled: boolean;
};

function envBool(name: string, defaultTrue = true): boolean {
  const v = process.env[name];
  if (v == null) return defaultTrue;
  const val = String(v).toLowerCase().trim();
  if (['0', 'false', 'off', 'no', 'disabled'].includes(val)) return false;
  if (['1', 'true', 'on', 'yes', 'enabled'].includes(val)) return true;
  return defaultTrue;
}

export const flags: FeatureFlags = {
  // Kill switch for Socket.IO realtime features
  realtimeEnabled: envBool('FEATURE_REALTIME', true),
  // Kill switch for search endpoint
  searchEnabled: envBool('FEATURE_SEARCH', true),
};
