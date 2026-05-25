import { createLogger } from './utils/logger';
import { DOMAIN_METHODS } from './create-store';

// ── Store contract ───────────────────────────────────────────────────────────
// Minimal interface — avoids the setContext contravariance issue.
// Accepts both `GenericStore` (mutations at root) and `DomainStore` (domain
// methods accessed via the DOMAIN_METHODS symbol). Each kind is detected at
// runtime and instrumented differently.

/** @internal */
type DebugLogCompatibleStore<TSnapshot> = {
  readonly subscribe: (listener: () => void) => () => void;
  readonly getSnapshot: () => TSnapshot;
  readonly listenerCount: number;
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
    onLog('init', computeDiff(undefined, initSnapshot), 0, 0, store.listenerCount);
  } else {
    if (logger) {
      logger.group('init #0000-00', () => ({
        diff: computeDiff(undefined, initSnapshot),
        snapshot: initSnapshot,
      }));
    }
  }

  // ── Action tracking ────────────────────────────────────────────────────────
  let currentAction: string | undefined;
  let currentActionId: number | undefined;
  let currentActionSubId = 0;
  let prevSnapshot: TSnapshot | undefined;
  let batchActions: string[] = [];
  let inBatch = false;
  let startTime: number | undefined;
  // trackingDepth: total active frames (domain + built-in wrappers combined).
  // When > 0, inner wrappers skip trackAction so they don't overwrite the
  // outermost action name already in flight.
  let trackingDepth = 0;
  // domainDepth: frames from wrapDomainMethod only (excludes standalone built-in
  // calls). The subscription callback uses this to decide whether to clear
  // tracking state after logging: 0 means a standalone built-in call (clear
  // immediately), > 0 means inside a domain method (keep for incremental diffs).
  let domainDepth = 0;
  let actionCounter = 0;

  function trackAction(actionName: string): void {
    if (inBatch) {
      batchActions.push(actionName);
    } else {
      currentAction = actionName;
      currentActionId = undefined;
      currentActionSubId = 0;
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

  function wrapDomainMethod<T extends (...args: unknown[]) => unknown>(
    fn: T,
    actionName: string
  ): T {
    return new Proxy(fn, {
      apply(target: T, thisArg: unknown, args: Parameters<T>) {
        if (trackingDepth === 0) {
          trackAction(actionName);
        }
        trackingDepth++;
        domainDepth++;
        let result: unknown;
        try {
          result = Reflect.apply(target, thisArg, args);
        } catch (error) {
          trackingDepth--;
          domainDepth--;
          if (trackingDepth === 0) {
            clearTracking();
          }
          throw error;
        }
        if (result instanceof Promise) {
          return result.finally(() => {
            trackingDepth--;
            domainDepth--;
            if (trackingDepth === 0) {
              clearTracking();
            }
          });
        }
        trackingDepth--;
        domainDepth--;
        if (trackingDepth === 0) {
          clearTracking();
        }
        return result;
      },
    });
  }

  // The proxy wrapper cannot preserve precise tuple-shaped parameters here,
  // so we use `any[]` for the internal apply signature only.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function wrapBuiltIn<T extends (...args: any[]) => unknown>(
    fn: T,
    actionName: (args: Parameters<T>) => string
  ): T {
    return new Proxy<T>(fn, {
      apply(target: T, thisArg: unknown, args: Parameters<T>) {
        if (trackingDepth === 0) {
          trackAction(actionName(args));
        }
        // Depth tracking prevents inner built-in calls (e.g. a domain `reset`
        // calling `api.set`) from overwriting the current action name. Clearing
        // is intentionally left to the subscription callback (domainDepth === 0
        // path) so that stores with deferred notification still log correctly.
        trackingDepth++;
        try {
          return Reflect.apply(target, thisArg, args) as ReturnType<T>;
        } finally {
          trackingDepth--;
        }
      },
    });
  }

  // ── Discover domain methods (if any) ───────────────────────────────────────
  // A DomainStore stores its methods object under the DOMAIN_METHODS symbol.
  // A GenericStore has no such slot — instrument its built-in mutations instead.

  const domainMethods = (store as Record<symbol, unknown>)[DOMAIN_METHODS] as
    | Record<string, unknown>
    | undefined;

  // ── Wrap built-in mutation methods (GenericStore only) ─────────────────────

  type GenericMutationStore<T> = {
    set: (next: T | ((prev: T) => T)) => void;
    update: (recipe: (draft: T) => void) => void;
    setByPath: (path: string, value: unknown) => void;
    batch: (fn: () => void) => void;
    reset: (next?: T | ((initial: T) => T)) => void;
    run: (actionName: string, fn: () => void) => void;
  };

  type BuiltInOriginals<T> = {
    readonly set: GenericMutationStore<T>['set'];
    readonly update: GenericMutationStore<T>['update'];
    readonly setByPath: GenericMutationStore<T>['setByPath'];
    readonly batch: GenericMutationStore<T>['batch'];
    readonly reset: GenericMutationStore<T>['reset'];
    readonly run: GenericMutationStore<T>['run'];
  };

  let builtInOriginals: BuiltInOriginals<TSnapshot> | undefined;

  if (domainMethods === undefined) {
    const mutableStore = store as unknown as GenericMutationStore<TSnapshot> &
      Record<string, unknown>;
    const originalSet = mutableStore.set;
    const originalUpdate = mutableStore.update;
    const originalSetByPath = mutableStore.setByPath;
    const originalBatch = mutableStore.batch;
    const originalReset = mutableStore.reset;
    const originalRun = mutableStore.run;

    builtInOriginals = {
      set: originalSet,
      update: originalUpdate,
      setByPath: originalSetByPath,
      batch: originalBatch,
      reset: originalReset,
      run: originalRun,
    };

    const wrapBatch = (fn: typeof originalBatch): typeof originalBatch =>
      new Proxy<typeof originalBatch>(fn, {
        apply(
          target: typeof originalBatch,
          thisArg: unknown,
          args: Parameters<typeof originalBatch>
        ) {
          if (trackingDepth > 0) {
            Reflect.apply(target, thisArg, args);
            return;
          }
          inBatch = true;
          batchActions = [];
          prevSnapshot = store.getSnapshot();
          startTime = performance.now();
          currentActionId = undefined;
          currentActionSubId = 0;
          Reflect.apply(target, thisArg, [
            () => {
              args[0]();
              inBatch = false;
              currentAction = `batch(${batchActions.join(', ')})`;
              batchActions = [];
            },
          ]);
          return;
        },
      });

    mutableStore['set'] = wrapBuiltIn<typeof originalSet>(originalSet, () => 'set');
    mutableStore['update'] = wrapBuiltIn<typeof originalUpdate>(originalUpdate, () => 'update');
    mutableStore['setByPath'] = wrapBuiltIn<typeof originalSetByPath>(
      originalSetByPath,
      (args) => `setByPath(${args[0]})`
    );
    mutableStore['reset'] = wrapBuiltIn<typeof originalReset>(originalReset, () => 'reset');
    mutableStore['batch'] = wrapBatch(originalBatch);
    mutableStore['run'] = wrapBuiltIn<typeof originalRun>(originalRun, (args) => args[0]);
  }

  // ── Wrap domain methods ────────────────────────────────────────────────────

  type OriginalEntry = {
    readonly fn: (...args: unknown[]) => unknown;
    readonly owner: Record<string, unknown>;
    readonly key: string;
  };

  const originals: OriginalEntry[] = [];

  function wrapMethods(obj: Record<string, unknown>, prefix: string): void {
    for (const key of Object.keys(obj)) {
      const value = obj[key];
      if (typeof value === 'function') {
        const actionName = prefix ? `${prefix}.${key}` : key;
        originals.push({ fn: value as (...args: unknown[]) => unknown, owner: obj, key });
        obj[key] = wrapDomainMethod(value as (...args: unknown[]) => unknown, actionName);
      } else if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        wrapMethods(value as Record<string, unknown>, prefix ? `${prefix}.${key}` : key);
      }
    }
  }

  if (domainMethods !== undefined) {
    wrapMethods(domainMethods, '');
  }

  // ── Store subscription → logger ────────────────────────────────────────────

  const unsubscribeStore = store.subscribe(() => {
    if (currentAction === undefined) {
      logger?.warn(
        '⚠️ Untracked store mutation detected — a stale reference to a pre-wrap method was called directly. Please use the store methods exposed by connectDebugLog instead.'
      );
      return;
    }
    const action = currentAction;
    let actionId = currentActionId;
    const subId = currentActionSubId++;
    const prev = prevSnapshot;
    const next = store.getSnapshot();
    const durationMs = startTime !== undefined ? performance.now() - startTime : 0;
    const listenerCount = store.listenerCount;
    if (actionId === undefined) {
      actionId = ++actionCounter;
      currentActionId = actionId;
    }
    if (domainDepth === 0) {
      // Standalone built-in call (or deferred notification after it returned) —
      // clear tracking now that the notification has been processed.
      clearTracking();
    } else {
      // Still inside an async domain method — keep the action name, advance
      // prevSnapshot so the next subscription fire diffs incrementally.
      prevSnapshot = next;
      startTime = performance.now();
    }
    if (onLog) {
      onLog(action, computeDiff(prev, next), durationMs, actionId, listenerCount);
    } else {
      if (logger) {
        // The logger itself is subscribed to the store, so subtract it from the
        // printed listener count to show external listeners only.
        const visibleListenerCount = Math.max(0, listenerCount - 1);
        const idTag = ` #${String(actionId).padStart(4, '0')}-${String(subId).padStart(2, '0')}`;
        logger.group(
          `${action}${idTag} (${durationMs.toFixed(2)}ms, listeners:${String(visibleListenerCount)})`,
          () => ({
            diff: computeDiff(prev, next),
            snapshot: next,
          })
        );
      }
    }
  });

  // ── Disconnect ─────────────────────────────────────────────────────────────

  return function disconnect(): void {
    unsubscribeStore();

    if (builtInOriginals) {
      const mutableStore = store as Record<string, unknown>;
      mutableStore['set'] = builtInOriginals.set;
      mutableStore['update'] = builtInOriginals.update;
      mutableStore['setByPath'] = builtInOriginals.setByPath;
      mutableStore['batch'] = builtInOriginals.batch;
      mutableStore['reset'] = builtInOriginals.reset;
      mutableStore['run'] = builtInOriginals.run;
    }

    for (const entry of originals) {
      entry.owner[entry.key] = entry.fn;
    }
    originals.length = 0;
  };
}
