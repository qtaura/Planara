export function isOffline(): boolean {
  try {
    return typeof navigator !== 'undefined' && 'onLine' in navigator ? !navigator.onLine : false;
  } catch {
    return false;
  }
}

export function waitForOnline(timeoutMs = 120000): Promise<void> {
  return new Promise((resolve) => {
    let done = false;
    const onOnline = () => {
      if (done) return;
      done = true;
      try {
        window.removeEventListener('online', onOnline);
      } catch {}
      resolve();
    };
    try {
      window.addEventListener('online', onOnline);
    } catch {}
    if (timeoutMs > 0) {
      setTimeout(() => {
        if (done) return;
        done = true;
        try {
          window.removeEventListener('online', onOnline);
        } catch {}
        resolve();
      }, timeoutMs);
    }
  });
}

export async function retryWhenOnline<T>(
  fn: () => Promise<T>,
  options?: { delayMs?: number }
): Promise<T> {
  if (isOffline()) {
    await waitForOnline(options?.delayMs ?? 0);
  }
  return fn();
}