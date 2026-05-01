import { createLogger } from './utils/logger';
import type { PathsOf, ValueAtPath } from './path-utils';

// ── Store contract ───────────────────────────────────────────────────────────
// Minimal interface — avoids the setContext contravariance issue.

/** @internal */
type DebugLogCompatibleStore<TSnapshot> = {
  readonly subscribe: (listener: () => void) => () => void;
  readonly getSnapshot: () => TSnapshot;
  readonly listenerCount: number;
  readonly set: (next: TSnapshot | ((prev: TSnapshot) => TSnapshot)) => void;
  readonly update: (recipe: (draft: TSnapshot) => void) => void;
  readonly setByPath: <P extends PathsOf<TSnapshot>>(
    path: P,
    value: ValueAtPath<TSnapshot, P>
  ) => void;
  readonly batch: (fn: () => void) => void;
  readonly reset: (next?: TSnapshot | ((initial: TSnapshot) => TSnapshot)) => void;
};

// ── Options ──────────────────────────────────────────────────────────────────

/**
 * Options for {@link connectDebugLog}.
 *
 * @param name - Forms the logger namespace: `store:name`. Omit for bare `store`.
 *   Only used when `onLog` is not provided. Enable in the browser console:
 *   ```
 *   localStorage.setItem('stardust:log', 'store')          // all stores
 *   localStorage.setItem('stardust:log', 'store:counter')  // one store
 *   ```
 * @param onLog - Custom log handler. Receives the action name, a flat diff of
 *   changed paths (`{ "address.city": { from: "A", to: "B" } }`), the elapsed
 *   time in milliseconds for the operation, the current live listener count at
 *   notify time, and a monotonically increasing `actionId` (0 = init, 1+ =
 *   mutations). The live listener count passed to `onLog` reflects the actual
 *   subscription set at notify time; the built-in logger subtracts its own
 *   internal debug subscription from the printed `listeners:N` value for
 *   clearer external visibility. All subscription fires from the same async
 *   action share the same `actionId`, making it easy to correlate log entries.
 *   When provided, the built-in `createLogger` is bypassed entirely — useful
 *   for standalone use outside the dialog library or for custom log formatting.
 */
export type ConnectDebugLogOptions = {
  readonly name?: string | undefined;
  readonly onLog?:
    | ((
        action: string,
        diff: DiffResult,
        durationMs: number,
        actionId: number,
        listenerCount: number
      ) => void)
    | undefined;
};

// ── Built-in keys (never treated as domain methods) ──────────────────────────

const BUILTIN_KEYS = new Set([
  'subscribe',
  'getSnapshot',
  'set',
  'update',
  'getByPath',
  'setByPath',
  'batch',
  'reset',
  'setContext',
]);

// ── Diff ─────────────────────────────────────────────────────────────────────

export type DiffResult = Record<string, { from: unknown; to: unknown }>;

function computeDiff(prev: unknown, next: unknown, path = ''): DiffResult {
  const result: DiffResult = {};

  if (Object.is(prev, next)) {
    return result;
  }

  if (prev !== null && next !== null && typeof prev === 'object' && typeof next === 'object') {
    if (Array.isArray(prev) && Array.isArray(next)) {
      const len = Math.max(prev.length, next.length);
      for (let i = 0; i < len; i++) {
        Object.assign(result, computeDiff(prev[i], next[i], `${path}[${String(i)}]`));
      }
      return result;
    }

    if (!Array.isArray(prev) && !Array.isArray(next)) {
      const keys = new Set([...Object.keys(prev), ...Object.keys(next)]);
      for (const key of keys) {
        const nested = computeDiff(
          (prev as Record<string, unknown>)[key],
          (next as Record<string, unknown>)[key],
          path ? `${path}.${key}` : key
        );
        Object.assign(result, nested);
      }
      return result;
    }
  }

  result[path || '(root)'] = { from: prev, to: next };
  return result;
}

// ── Implementation ───────────────────────────────────────────────────────────

/**
 * Connects a store to the `stardust:store` debug logger.
 *
 * Every mutation — built-in and domain — is logged with its action name and
 * the resulting snapshot. Controlled by the same `localStorage` pattern as
 * every other module in the library; no browser extension required.
 *
 * **Activation:**
 * ```
 * // All stores:
 * localStorage.setItem('stardust:log', 'store');
 *
 * // One store (when name is provided):
 * localStorage.setItem('stardust:log', 'store:counter');
 * ```
 *
 * @returns A `disconnect` function that removes all subscriptions and restores
 * original methods.
 *
 * @example
 * const counter = createStore({ count: 0 }, ({ update }) => ({
 *   increment() { update(d => { d.count += 1; }); },
 * }));
 *
 * if (import.meta.env.DEV) {
 *   connectDebugLog(counter, { name: 'counter' });
 * }
 * // Activate in DevTools: localStorage.setItem('stardust:log', 'store:counter')
 *
 * // Store the disconnect if you need to detach later:
 * const disconnect = connectDebugLog(counter, { name: 'counter' });
 * disconnect();
 */
export function connectDebugLog<TSnapshot>(
  store: DebugLogCompatibleStore<TSnapshot> & Record<string, unknown>,
  options?: ConnectDebugLogOptions
): () => void {
  const onLog = options?.onLog;
  const logger = onLog ? null : createLogger(options?.name ? `store:${options.name}` : 'store');

  // ── Init log ──────────────────────────────────────────────────────────────
  const initSnapshot = store.getSnapshot();
  if (onLog) {
    onLog('init', computeDiff(undefined, initSnapshot), 0, 0);
  } else {
    if (logger) {
      logger.group('init #0000', () => computeDiff(undefined, initSnapshot));
    }
  }

  // ── Action tracking ────────────────────────────────────────────────────────
  let currentAction: string | undefined;
  let currentActionId: number | undefined;
  let prevSnapshot: TSnapshot | undefined;
  let batchActions: string[] = [];
  let inBatch = false;
  let startTime: number | undefined;
  // Counts active domain-method frames (including pending async continuations).
  // When > 0, built-in wrappers skip trackAction so they don't overwrite the
  // domain method name already in flight.
  let trackingDepth = 0;
  let actionCounter = 0;

  function trackAction(actionName: string): void {
    if (inBatch) {
      batchActions.push(actionName);
    } else {
      currentAction = actionName;
      currentActionId = ++actionCounter;
      prevSnapshot = store.getSnapshot();
      startTime = performance.now();
    }
  }

  function clearTracking(): void {
    currentAction = undefined;
    currentActionId = undefined;
    prevSnapshot = undefined;
    startTime = undefined;
  }

  // ── Wrap built-in mutation methods ─────────────────────────────────────────

  const originalSet = store.set;
  const originalUpdate = store.update;
  const originalSetByPath = store.setByPath;
  const originalBatch = store.batch;
  const originalReset = store.reset;

  const mutableStore = store as Record<string, unknown>;

  mutableStore['set'] = function wrappedSet(
    next: TSnapshot | ((prev: TSnapshot) => TSnapshot)
  ): void {
    if (trackingDepth === 0) {
      trackAction('set');
    }
    originalSet.call(store, next);
  };

  mutableStore['update'] = function wrappedUpdate(recipe: (draft: TSnapshot) => void): void {
    if (trackingDepth === 0) {
      trackAction('update');
    }
    originalUpdate.call(store, recipe);
  };

  mutableStore['setByPath'] = function wrappedSetByPath<P extends PathsOf<TSnapshot>>(
    path: P,
    value: ValueAtPath<TSnapshot, P>
  ): void {
    if (trackingDepth === 0) {
      trackAction(`setByPath(${path})`);
    }
    originalSetByPath.call(store, path, value);
  };

  mutableStore['reset'] = function wrappedReset(
    next?: TSnapshot | ((initial: TSnapshot) => TSnapshot)
  ): void {
    if (trackingDepth === 0) {
      trackAction('reset');
    }
    originalReset.call(store, next);
  };

  mutableStore['batch'] = function wrappedBatch(fn: () => void): void {
    if (trackingDepth > 0) {
      // Inside a domain method — passthrough; tracking is owned by the caller.
      originalBatch.call(store, fn);
      return;
    }
    inBatch = true;
    batchActions = [];
    prevSnapshot = store.getSnapshot();
    startTime = performance.now();
    originalBatch.call(store, () => {
      fn();
      inBatch = false;
      currentAction = `batch(${batchActions.join(', ')})`;
      batchActions = [];
    });
  };

  // ── Wrap domain methods ────────────────────────────────────────────────────

  type OriginalEntry = {
    readonly fn: (...args: unknown[]) => unknown;
    readonly owner: Record<string, unknown>;
    readonly key: string;
  };

  const originals: OriginalEntry[] = [];

  function wrapMethods(obj: Record<string, unknown>, prefix: string): void {
    for (const key of Object.keys(obj)) {
      if (prefix === '' && BUILTIN_KEYS.has(key)) {
        continue;
      }
      const value = obj[key];
      if (typeof value === 'function') {
        const actionName = prefix ? `${prefix}.${key}` : key;
        originals.push({ fn: value as (...args: unknown[]) => unknown, owner: obj, key });
        const original = value as (...args: unknown[]) => unknown;
        obj[key] = function wrappedDomain(...args: unknown[]): unknown {
          if (trackingDepth === 0) {
            trackAction(actionName);
          }
          trackingDepth++;
          let result: unknown;
          try {
            result = original(...args);
          } catch (e) {
            trackingDepth--;
            if (trackingDepth === 0) {
              clearTracking();
            }
            throw e;
          }
          if (result instanceof Promise) {
            return (result as Promise<unknown>).finally(() => {
              trackingDepth--;
              if (trackingDepth === 0) {
                clearTracking();
              }
            });
          }
          trackingDepth--;
          if (trackingDepth === 0) {
            clearTracking();
          }
          return result;
        };
      } else if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        wrapMethods(value as Record<string, unknown>, prefix ? `${prefix}.${key}` : key);
      }
    }
  }

  wrapMethods(mutableStore, '');

  // ── Store subscription → logger ────────────────────────────────────────────

  const unsubscribeStore = store.subscribe(() => {
    if (currentAction === undefined) {
      logger?.warn(
        '⚠️ Untracked store mutation detected — a stale reference to a pre-wrap method was called directly. Please use the store methods exposed by connectDebugLog instead.'
      );
      return;
    }
    const action = currentAction;
    const actionId = currentActionId;
    const prev = prevSnapshot;
    const next = store.getSnapshot();
    const durationMs = startTime !== undefined ? performance.now() - startTime : 0;
    const listenerCount = store.listenerCount;
    if (trackingDepth === 0) {
      // Sync op or standalone built-in — clear tracking immediately.
      clearTracking();
    } else {
      // Still inside an async domain method — keep the action name, advance
      // prevSnapshot so the next subscription fire diffs incrementally.
      prevSnapshot = next;
      startTime = performance.now();
    }
    if (onLog) {
      onLog(action, computeDiff(prev, next), durationMs, actionId ?? 0, listenerCount);
    } else {
      if (logger) {
        // The logger itself is subscribed to the store, so subtract it from the
        // printed listener count to show external listeners only.
        const visibleListenerCount = Math.max(0, listenerCount - 1);
        const idTag = actionId !== undefined ? ` #${String(actionId).padStart(4, '0')}` : '';
        logger.group(
          `${action}${idTag} (${durationMs.toFixed(2)}ms, listeners:${String(visibleListenerCount)})`,
          () => computeDiff(prev, next)
        );
      }
    }
  });

  // ── Disconnect ─────────────────────────────────────────────────────────────

  return function disconnect(): void {
    unsubscribeStore();

    mutableStore['set'] = originalSet;
    mutableStore['update'] = originalUpdate;
    mutableStore['setByPath'] = originalSetByPath;
    mutableStore['batch'] = originalBatch;
    mutableStore['reset'] = originalReset;

    for (const entry of originals) {
      entry.owner[entry.key] = entry.fn;
    }
    originals.length = 0;
  };
}
