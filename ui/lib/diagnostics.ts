// Minimal diagnostics overlay for silent boot failures.
// CSP-safe: no eval, pure DOM + event hooks.

type Level = 'info' | 'warn' | 'error';

let overlayEl: HTMLDivElement | null = null;
let listEl: HTMLUListElement | null = null;
let stageEl: HTMLSpanElement | null = null;
let lastError: any = null;
let rootObserver: MutationObserver | null = null;

function ensureOverlay() {
  if (overlayEl) return overlayEl;
  overlayEl = document.createElement('div');
  overlayEl.id = 'diagnostics-overlay';
  overlayEl.style.position = 'fixed';
  overlayEl.style.bottom = '12px';
  overlayEl.style.right = '12px';
  overlayEl.style.zIndex = '2147483647';
  overlayEl.style.maxWidth = '420px';
  overlayEl.style.fontFamily = 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial';
  overlayEl.style.fontSize = '12px';
  overlayEl.style.lineHeight = '1.4';
  overlayEl.style.color = '#0f172a';
  overlayEl.style.background = 'rgba(255,255,255,0.95)';
  overlayEl.style.border = '1px solid #e2e8f0';
  overlayEl.style.borderRadius = '10px';
  overlayEl.style.boxShadow = '0 8px 24px rgba(2, 6, 23, 0.25)';
  overlayEl.style.padding = '10px 12px';

  const header = document.createElement('div');
  header.style.display = 'flex';
  header.style.alignItems = 'center';
  header.style.justifyContent = 'space-between';
  const title = document.createElement('strong');
  title.textContent = 'UI Diagnostics';
  const right = document.createElement('div');
  right.style.display = 'flex';
  right.style.gap = '8px';

  stageEl = document.createElement('span');
  stageEl.textContent = 'stage: init';
  stageEl.style.color = '#334155';

  const closeBtn = document.createElement('button');
  closeBtn.textContent = 'hide';
  closeBtn.style.background = '#f1f5f9';
  closeBtn.style.border = '1px solid #e2e8f0';
  closeBtn.style.borderRadius = '6px';
  closeBtn.style.padding = '2px 6px';
  closeBtn.style.cursor = 'pointer';
  closeBtn.onclick = () => overlayEl && (overlayEl.style.display = 'none');

  right.appendChild(stageEl);
  right.appendChild(closeBtn);
  header.appendChild(title);
  header.appendChild(right);

  listEl = document.createElement('ul');
  listEl.style.margin = '8px 0 0';
  listEl.style.padding = '0';
  listEl.style.listStyle = 'none';
  listEl.style.maxHeight = '160px';
  listEl.style.overflow = 'auto';

  overlayEl.appendChild(header);
  overlayEl.appendChild(listEl);
  document.body.appendChild(overlayEl);
  return overlayEl;
}

function addItem(level: Level, msg: string) {
  ensureOverlay();
  if (!listEl) return;
  const li = document.createElement('li');
  li.style.display = 'flex';
  li.style.gap = '6px';
  const badge = document.createElement('span');
  badge.textContent = level.toUpperCase();
  badge.style.fontSize = '10px';
  badge.style.padding = '0 4px';
  badge.style.borderRadius = '4px';
  badge.style.border = '1px solid #e2e8f0';
  badge.style.color = level === 'error' ? '#b91c1c' : level === 'warn' ? '#b45309' : '#1f2937';
  badge.style.background = level === 'error' ? '#fee2e2' : level === 'warn' ? '#ffedd5' : '#f1f5f9';
  const text = document.createElement('span');
  text.textContent = msg;
  text.style.flex = '1';
  li.appendChild(badge);
  li.appendChild(text);
  listEl.appendChild(li);
}

export function setStage(stage: string) {
  ensureOverlay();
  if (stageEl) stageEl.textContent = `stage: ${stage}`;
  addItem('info', `stage -> ${stage}`);
}

function startRootObserver() {
  try {
    const root = document.getElementById('root');
    if (!root) return;
    addItem('info', `root children count: ${root.childNodes.length}`);
    rootObserver = new MutationObserver((mutations) => {
      const count = root.childNodes.length;
      addItem('info', `root mutation: children=${count}`);
      for (const m of mutations) {
        if (m.addedNodes && m.addedNodes.length) {
          addItem('info', `root addedNodes: ${m.addedNodes.length}`);
        }
        if (m.removedNodes && m.removedNodes.length) {
          addItem('warn', `root removedNodes: ${m.removedNodes.length}`);
        }
      }
    });
    rootObserver.observe(root, { childList: true, subtree: true });
  } catch (e) {
    addItem('warn', `root observer failed: ${String(e)}`);
  }
}

export function startDiagnostics() {
  try {
    ensureOverlay();
    setStage('boot:init');
    // Hook global errors
    window.addEventListener('error', (e) => {
      lastError = e.error || e.message;
      addItem('error', `window.onerror: ${String(lastError)}`);
    });
    window.addEventListener('unhandledrejection', (e) => {
      lastError = e.reason;
      addItem('error', `unhandledrejection: ${String(lastError)}`);
    });
    // Wrap console to mirror logs into overlay
    const origLog = console.log;
    const origWarn = console.warn;
    const origError = console.error;
    console.log = (...args) => {
      try { addItem('info', args.map(String).join(' ')); } catch {}
      origLog.apply(console, args as any);
    };
    console.warn = (...args) => {
      try { addItem('warn', args.map(String).join(' ')); } catch {}
      origWarn.apply(console, args as any);
    };
    console.error = (...args) => {
      try { addItem('error', args.map(String).join(' ')); } catch {}
      origError.apply(console, args as any);
    };

    // DOM checks
    document.addEventListener('DOMContentLoaded', () => {
      setStage('dom:ready');
      const root = document.getElementById('root');
      if (!root) addItem('error', 'No #root element found');
      else addItem('info', '#root present');
      startRootObserver();
      // After 1500ms, verify something is mounted
      setTimeout(() => {
        const hasChildren = !!root && root.childNodes.length > 0;
        addItem(hasChildren ? 'info' : 'warn', hasChildren ? 'React children present' : 'React children missing');
      }, 1500);
    });
  } catch (err) {
    addItem('error', `diagnostics init failed: ${String(err)}`);
  }
}