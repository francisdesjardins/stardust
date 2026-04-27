/**
 * Lightweight, zero-dependency debug logger for browser devtools.
 *
 * Designed for library authors: near-zero overhead when disabled, structured
 * data objects, and colored namespace labels in the console.
 *
 * ## Activation
 *
 * ```ts
 * // Via localStorage (persists across reloads):
 * localStorage.setItem('stardust:log', '*');       // all namespaces
 * localStorage.setItem('stardust:log', 'store');   // all stores
 * localStorage.setItem('stardust:log', 'store:counter'); // one store
 * localStorage.setItem('stardust:log', 'stardust:store'); // prefixed form also works
 *
 * // Via programmatic API (session only, unless persist = true):
 * import { setLogLevel } from '@stardust/core';
 * setLogLevel('*');
 * setLogLevel('store');
 * setLogLevel(false); // disable
 * ```
 *
 * ## Namespaces
 *
 * | Namespace       | Module                            |
 * |-----------------|-----------------------------------|
 * | `store`         | All stores (via connectDebugLog)  |
 * | `store:<name>`  | One named store                   |
 */

const storageKey = 'stardust:log';

// ── Namespace colors (visible in browser devtools) ──────────────────────────

const colors: Readonly<Record<string, string>> = {
  store: '#FFC107',
};

const labelStyle = (color: string) =>
  `color:${color};font-weight:bold;padding:1px 4px;border-radius:2px`;
const resetStyle = 'color:inherit';

// ── Pattern matching ────────────────────────────────────────────────────────

// In-memory override set via `setLogLevel()`. Takes priority over localStorage.
// `undefined` means "not set, fall back to localStorage".
let sessionOverride: string | null | undefined;

function getPattern(): string | null {
  if (sessionOverride !== undefined) {
    return sessionOverride;
  }
  try {
    return globalThis.localStorage.getItem(storageKey) ?? null;
  } catch {
    return null;
  }
}

const namespacePrefix = 'stardust:';

/** Strip the `stardust:` prefix so both `'store'` and `'stardust:store'` work. */
function normalize(token: string): string {
  const t = token.trim();
  return t.startsWith(namespacePrefix) ? t.slice(namespacePrefix.length) : t;
}

function matches(namespace: string): boolean {
  const pattern = getPattern();
  if (!pattern) {
    return false;
  }
  if (pattern === '*') {
    return true;
  }
  return pattern.split(',').some((p) => {
    const n = normalize(p);
    return namespace === n || namespace.startsWith(n + ':');
  });
}

// ── Logger type ─────────────────────────────────────────────────────────────

export type LogData = Record<string, unknown> | (() => Record<string, unknown>);

export type Logger = {
  /** Log a debug-level message with optional structured data (or a lazy thunk). */
  (message: string, data?: LogData): void;
  /** Log a warning with optional structured data (or a lazy thunk). */
  warn(message: string, data?: LogData): void;
  /** Log an error with optional structured data (or a lazy thunk). */
  error(message: string, data?: LogData): void;
  /** Log a collapsed group with a header line and structured data inside. */
  group(message: string, data?: LogData): void;
};

// ── Factory ─────────────────────────────────────────────────────────────────

/**
 * Create a namespaced logger instance.
 *
 * @param namespace - Logger namespace (e.g. `'store'`, `'store:counter'`)
 * @returns A callable logger with `.warn()`, `.error()`, and `.group()` methods
 *
 * @example
 * const log = createLogger('store');
 * log('mutation', { count: 1 });
 * log.warn('unexpected state');
 *
 * @internal
 */
function resolveColor(namespace: string): string {
  if (colors[namespace]) {
    return colors[namespace];
  }
  const idx = namespace.lastIndexOf(':');
  return idx !== -1 ? resolveColor(namespace.slice(0, idx)) : '#999';
}

export function createLogger(namespace: string): Logger {
  const color = resolveColor(namespace);
  const prefix = `stardust:${namespace}`;

  function emit(method: 'debug' | 'warn' | 'error', message: string, data: LogData | undefined) {
    if (!matches(namespace)) {
      return;
    }
    const resolved = typeof data === 'function' ? data() : data;
    if (resolved !== undefined) {
      console[method](`%c${prefix}%c ${message}`, labelStyle(color), resetStyle, resolved);
    } else {
      console[method](`%c${prefix}%c ${message}`, labelStyle(color), resetStyle);
    }
  }

  function log(message: string, data?: LogData): void {
    emit('debug', message, data);
  }
  log.warn = (message: string, data?: LogData): void => {
    emit('warn', message, data);
  };
  log.error = (message: string, data?: LogData): void => {
    emit('error', message, data);
  };
  log.group = (message: string, data?: LogData): void => {
    if (!matches(namespace)) {
      return;
    }
    const resolved = typeof data === 'function' ? data() : data;
    console.groupCollapsed(`%c${prefix}%c ${message}`, labelStyle(color), resetStyle);
    if (resolved !== undefined) {
      console.debug(resolved);
    }
    console.groupEnd();
  };

  return log;
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Programmatically enable or disable debug logging.
 *
 * @param pattern - Namespace filter (`'*'` for all, `'store'` for all stores,
 *                  `'store:counter'` for one store), or `false` to disable.
 * @param persist - If `true`, writes to `localStorage` so the setting survives
 *                  page reloads. Defaults to `false` (session only).
 *
 * @example
 * import { setLogLevel } from '@stardust/core';
 *
 * setLogLevel('*');             // enable all, session only
 * setLogLevel('store', true);  // enable all store logs, persisted
 * setLogLevel(false);           // disable all
 */
export function setLogLevel(pattern: string | false, persist = false): void {
  if (pattern === false) {
    sessionOverride = null;
    if (persist) {
      try {
        globalThis.localStorage.removeItem(storageKey);
      } catch {
        /* SSR / restricted context */
      }
    }
  } else {
    sessionOverride = pattern;
    if (persist) {
      try {
        globalThis.localStorage.setItem(storageKey, pattern);
      } catch {
        /* SSR / restricted context */
      }
    }
  }
}
