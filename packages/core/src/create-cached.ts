import type { StoreApi } from './create-store';
import type { PathsOf, ValueAtPath } from './path-utils';
import { copyOnWritePath, parsePath } from './path-utils';
import { createSingleFlight } from './single-flight';
import { safeAwait } from './safe-await';
import {
  type CachedFresh,
  type CachedState,
  cachedExpired,
  cachedFresh,
  cachedPending,
  cachedRejected,
  getCachedData,
} from './cached-state';

// ── Types ─────────────────────────────────────────────────────────────────────

/**
 * Non-exclusive options shared across all `CachedOptions` variants.
 */
type CachedOptionsBase<TValue, TContext, TApiSnapshot> = {
  /**
   * Equality function used by `set()` and `refresh()` to skip redundant store
   * writes. Defaults to `Object.is`.
   *
   * Cache data typically comes from an external source where reference
   * identity is meaningless — every fetch returns a new object even when the
   * data has not changed. Consider passing `shallowEqual` for flat object
   * snapshots so that semantically equal responses do not trigger a re-render.
   */
  readonly equals?: ((a: TValue, b: TValue) => boolean) | undefined;
  /**
   * Called automatically each expiration cycle by `startAutoRefresh()`.
   * Receives the current data (or `undefined` when state is `'idle'`).
   * Must return the new value — the helper writes it and transitions the
   * field to `CachedFresh<T>`.
   *
   * @example
   * refreshOnExpire: async (current, api) =>
   *   api.getContext().fetchProfile(current?.id ?? ''),
   */
  readonly refreshOnExpire?: (
    current: TValue | undefined,
    api: StoreApi<TApiSnapshot, TContext>
  ) => Promise<TValue>;
};

/**
 * Options for `createCachedSlice`.
 *
 * `keepPreviousData` and `placeholder` are mutually exclusive:
 * - `keepPreviousData: true` — while a fetch is in-flight the `CachedPending.data`
 *   field carries the previous value; `placeholder` is forbidden.
 * - `keepPreviousData: false` (default) — `CachedPending.data` is the
 *   `placeholder` value (if provided) or `undefined`.
 */
export type CachedOptions<
  TValue,
  TContext = never,
  TApiSnapshot = CachedState<TValue>,
> = CachedOptionsBase<TValue, TContext, TApiSnapshot> &
  (
    | { readonly keepPreviousData?: false | undefined; readonly placeholder?: TValue }
    | { readonly keepPreviousData: true; readonly placeholder?: never }
  );

/**
 * Per-call options for `refresh()` / `refreshIfExpired()`.
 *
 * `keepPreviousData` and `placeholder` are mutually exclusive:
 * - `keepPreviousData: true` — `CachedPending.data` carries the previous value
 *   for this call; `placeholder` is forbidden.
 * - `keepPreviousData: false` (default) — `CachedPending.data` is the
 *   `placeholder` value, overriding the helper-level default for this call.
 *
 * `expiresAt` stamps an absolute expiry timestamp (ms) on the `CachedFresh`
 * result. When omitted the result has no TTL and stays fresh indefinitely.
 */
export type CachedRefreshOptions<TValue> = {
  readonly expiresAt?: number;
} & (
  | { readonly keepPreviousData?: false | undefined; readonly placeholder?: TValue }
  | { readonly keepPreviousData: true; readonly placeholder?: never }
);

/**
 * Cache helper returned by `createCachedSlice`.
 *
 * The managed store field holds a `CachedState<TValue>` discriminated union.
 * Methods that write to the store transition the field between status variants.
 */
export type Cached<TValue> = {
  /** Returns the current `CachedState<TValue>` from the store field. */
  readonly get: () => CachedState<TValue>;
  /**
   * Write fresh data. Transitions the field to `CachedFresh` and schedules
   * an expiry timer when `expiresAt` is provided.
   *
   * When `data` is equal to the current value (by `equals`) and no `expiresAt`
   * is given, the write is skipped entirely. When `expiresAt` is given, the
   * fresh state is always rewritten to reset the TTL — even on equal data —
   * signalling that the data was verified as current.
   */
  readonly set: (data: TValue, expiresAt?: number) => void;
  /**
   * Manually mark the data as expired. Transitions the field from
   * `CachedFresh` to `CachedExpired` immediately. Useful after a related
   * mutation to force a re-fetch on the next access.
   *
   * No-op if the current status is not `'fresh'`.
   */
  readonly expire: () => void;
  /**
   * Fetch and commit new data.
   *
   * Transitions the field through `CachedPending → CachedFresh` on success
   * or `CachedPending → CachedRejected` on error (the thrown error re-throws
   * to the caller).
   *
   * Concurrent calls are deduplicated: while a fetch is in-flight every
   * subsequent call receives the same `Promise` and shares the result. Only
   * the first caller's `fetcher` and `options` are used.
   */
  readonly refresh: (
    fetcher: (current: TValue | undefined) => Promise<TValue>,
    options?: CachedRefreshOptions<TValue>
  ) => Promise<TValue>;
  /**
   * Refresh only if the current status is `'expired'`. Returns `undefined`
   * without calling the fetcher when the data is still fresh.
   */
  readonly refreshIfExpired: (
    fetcher: (current: TValue | undefined) => Promise<TValue>,
    options?: CachedRefreshOptions<TValue>
  ) => Promise<TValue | undefined>;
  /**
   * Arm the automatic expiry-and-refresh cycle.
   *
   * `interval` (ms) is the recurring TTL stamped on each refreshed value and
   * used as the retry delay after a rejected fetch. It also drives the first
   * expiry when the current state is `'fresh'` with no `expiresAt`.
   *
   * If the cache is already `'expired'` when called, `refreshOnExpire` is
   * triggered immediately rather than waiting for the next timer tick.
   */
  readonly startAutoRefresh: (options: { readonly interval: number }) => void;
  /**
   * Disarm automatic fetch-on-expire.
   *
   * The timer that transitions the field from `CachedFresh` to `CachedExpired`
   * continues to fire — expiry remains observable via `watch` and
   * `createDerivedStore`. Call `expire()` explicitly if you also want to
   * cancel the pending timer and immediately mark the cache as expired.
   */
  readonly stopAutoRefresh: () => void;
};

/**
 * @internal Extracts `TData` from `CachedState<TData>` by distributing over the union
 * and matching against `CachedFresh<U>` — the variant that always carries `data: T` non-optional.
 */
type ExtractCachedData<T> = T extends CachedFresh<infer U> ? U : never;

// ── Internal helpers ──────────────────────────────────────────────────────────

function resolveKeepPreviousData<TValue, TContext, TApiSnapshot>(
  helperOptions: CachedOptions<TValue, TContext, TApiSnapshot> | undefined,
  refreshOptions: CachedRefreshOptions<TValue> | undefined
): boolean {
  return refreshOptions?.keepPreviousData ?? helperOptions?.keepPreviousData ?? false;
}

function createCachedHelper<TValue, TContext, TApiSnapshot = CachedState<TValue>>(
  getState: () => CachedState<TValue>,
  setState: (state: CachedState<TValue>) => void,
  api: StoreApi<TApiSnapshot, TContext>,
  options?: CachedOptions<TValue, TContext, TApiSnapshot>
): Cached<TValue> {
  const refreshOnExpire = options?.refreshOnExpire;
  const equals = options?.equals ?? Object.is;

  let autoRefreshEnabled = false;
  let autoRefreshInterval: number | undefined;
  let expiryTimer: ReturnType<typeof setTimeout> | undefined;
  const flight = createSingleFlight();

  // ── Timer helpers ───────────────────────────────────────────────────────────

  function clearExpiryTimer(): void {
    if (expiryTimer !== undefined) {
      globalThis.clearTimeout(expiryTimer);
      expiryTimer = undefined;
    }
  }

  /**
   * Schedule (or reschedule) the expiry timer based on the current state.
   *
   * - `'fresh'` with `expiresAt`: fires at `expiresAt` → writes `CachedExpired`,
   *   making expiry observable via `watch` and `createDerivedStore`.
   * - `'fresh'` without `expiresAt`: no-op — stays fresh indefinitely.
   * - `'rejected'` with `autoRefreshEnabled` and `autoRefreshInterval`: schedules
   *   a retry after `autoRefreshInterval` ms.
   * - All other states: no-op.
   */
  function scheduleExpiryTimer(): void {
    clearExpiryTimer();

    const state = getState();
    let delay: number;

    if (state.status === 'fresh') {
      if (state.expiresAt !== undefined) {
        delay = Math.max(state.expiresAt - Date.now(), 0);
      } else {
        return; // no expiresAt — stays fresh indefinitely
      }
    } else if (
      state.status === 'rejected' &&
      autoRefreshEnabled &&
      refreshOnExpire !== undefined &&
      autoRefreshInterval !== undefined
    ) {
      delay = autoRefreshInterval; // retry after full interval
    } else {
      return;
    }

    expiryTimer = globalThis.setTimeout(() => {
      expiryTimer = undefined;
      void onExpiry();
    }, delay);
  }

  /**
   * Shared dispatch for the auto-refresh fetch. Called by `onExpiry` (timer path)
   * and `startAutoRefresh` (immediate path when state is already expired).
   * Guards on `autoRefreshEnabled` so callers do not need to check it themselves.
   */
  async function triggerAutoRefresh(): Promise<void> {
    if (!autoRefreshEnabled || refreshOnExpire === undefined) {
      return;
    }

    const keepPrevious = resolveKeepPreviousData(options, undefined);
    const placeholder = options?.placeholder;
    // Stamp the next expiresAt from the recurring interval so the cycle continues.
    const expiresAt =
      autoRefreshInterval !== undefined ? Date.now() + autoRefreshInterval : undefined;

    let autoRefreshOpts: CachedRefreshOptions<TValue>;
    if (keepPrevious) {
      autoRefreshOpts =
        expiresAt !== undefined
          ? { keepPreviousData: true, expiresAt }
          : { keepPreviousData: true };
    } else if (placeholder !== undefined) {
      autoRefreshOpts = expiresAt !== undefined ? { placeholder, expiresAt } : { placeholder };
    } else {
      autoRefreshOpts = expiresAt !== undefined ? { expiresAt } : {};
    }

    // safeAwait ensures the finally-equivalent runs on both success and error.
    // refresh() already writes cachedRejected and calls scheduleExpiryTimer() on failure.
    await safeAwait(refresh(async (current) => refreshOnExpire(current, api), autoRefreshOpts));
    if (expiryTimer === undefined) {
      scheduleExpiryTimer();
    }
  }

  async function onExpiry(): Promise<void> {
    const state = getState();

    if (state.status === 'fresh') {
      // Use expiresAt when available; fall back to now() for user-provided initial
      // states that didn't include an explicit expiresAt.
      const expiresAt = state.expiresAt ?? Date.now();
      // Write expired state — makes expiry observable in derived stores / watch.
      setState(cachedExpired(state.data, expiresAt));
    } else if (state.status !== 'rejected') {
      return; // timer is stale — state changed (pending, idle, etc.)
    }

    await triggerAutoRefresh();
  }

  // ── Public methods ──────────────────────────────────────────────────────────

  function set(data: TValue, expiresAt?: number): void {
    const currentData = getCachedData(getState());
    if (currentData !== undefined && equals(currentData, data)) {
      if (expiresAt !== undefined) {
        // Reset TTL even on equal data — confirms data is current, not just unchanged.
        setState(cachedFresh(data, expiresAt));
        scheduleExpiryTimer();
      }
      return;
    }
    setState(cachedFresh(data, expiresAt));
    scheduleExpiryTimer();
  }

  function expire(): void {
    const state = getState();
    if (state.status !== 'fresh') {
      return;
    }
    clearExpiryTimer();
    setState(cachedExpired(state.data, state.expiresAt ?? Date.now()));
  }

  async function refresh(
    fetcher: (current: TValue | undefined) => Promise<TValue>,
    refreshOptions?: CachedRefreshOptions<TValue>
  ): Promise<TValue> {
    return flight(async () => {
      clearExpiryTimer();
      const keepPrevious = resolveKeepPreviousData(options, refreshOptions);
      const currentData = getCachedData(getState());
      // Per-call placeholder takes priority; fall back to helper-level default.
      const pendingData = keepPrevious
        ? currentData
        : (refreshOptions?.placeholder ?? options?.placeholder);

      setState(cachedPending(pendingData));

      const result = await safeAwait(fetcher(currentData));
      if (result[0] !== null) {
        setState(cachedRejected(result[0], currentData));
        scheduleExpiryTimer();
        throw result[0];
      }
      setState(cachedFresh(result[1], refreshOptions?.expiresAt));
      scheduleExpiryTimer();
      return result[1];
    });
  }

  async function refreshIfExpired(
    fetcher: (current: TValue | undefined) => Promise<TValue>,
    refreshOptions?: CachedRefreshOptions<TValue>
  ): Promise<TValue | undefined> {
    if (getState().status !== 'expired') {
      return undefined;
    }
    return refresh(fetcher, refreshOptions);
  }

  function startAutoRefresh(opts: { readonly interval: number }): void {
    if (refreshOnExpire === undefined) {
      return;
    }
    autoRefreshEnabled = true;
    autoRefreshInterval = opts.interval;
    const state = getState();
    if (state.status === 'expired') {
      // Already expired — immediately trigger the fetch.
      void triggerAutoRefresh();
    } else if (state.status === 'fresh') {
      if (state.expiresAt !== undefined) {
        scheduleExpiryTimer(); // expiresAt already set — respect it
      } else {
        // No expiresAt in state — arm the first expiry directly using interval.
        clearExpiryTimer();
        expiryTimer = globalThis.setTimeout(() => {
          expiryTimer = undefined;
          void onExpiry();
        }, opts.interval);
      }
    }
    // pending / rejected: timer is set after the in-flight resolves or by the rejected retry path.
  }

  function stopAutoRefresh(): void {
    autoRefreshEnabled = false;
    // The expiry timer that transitions 'fresh' → 'expired' is intentionally
    // NOT cleared here — that transition is always observable via watch /
    // createDerivedStore regardless of auto-refresh state. Call expire()
    // explicitly if you need to immediately mark the cache as expired and
    // cancel the pending timer.
  }

  // Schedule initial expiry timer if the store starts in fresh state and expire is configured.
  scheduleExpiryTimer();

  return {
    get: getState,
    set,
    expire,
    refresh,
    refreshIfExpired,
    startAutoRefresh,
    stopAutoRefresh,
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

export function createCachedSlice<TData, TContext = never>(
  api: StoreApi<CachedState<TData>, TContext>,
  options?: CachedOptions<TData, TContext, CachedState<TData>>
): Cached<TData>;
export function createCachedSlice<TSnapshot, P extends PathsOf<TSnapshot>, TContext = never>(
  api: StoreApi<TSnapshot, TContext>,
  path: P,
  options?: CachedOptions<ExtractCachedData<ValueAtPath<TSnapshot, P>>, TContext, TSnapshot>
): Cached<ExtractCachedData<ValueAtPath<TSnapshot, P>>>;
// Implementation overload — types are intentionally widened; public overloads
// above enforce correctness at each call site.
export function createCachedSlice<TSnapshot, P extends PathsOf<TSnapshot>, TContext = never>(
  api: StoreApi<TSnapshot, TContext>,
  pathOrOptions?: P | CachedOptions<unknown, TContext, TSnapshot>,
  options?: CachedOptions<unknown, TContext, TSnapshot>
): Cached<unknown> {
  if (typeof pathOrOptions === 'string') {
    const path = pathOrOptions;
    const pathSegments = parsePath(path);
    return createCachedHelper(
      // Safe: the public overload constrains P to paths where ValueAtPath<TSnapshot, P>
      // extends CachedState<TData>. The cast recovers TData from the resolved field type.
      () => api.getByPath(path) as CachedState<unknown>,
      (state) => {
        api.set(copyOnWritePath(api.get(), pathSegments, state));
      },
      api,
      options
    );
  }

  const rootOptions = pathOrOptions;
  return createCachedHelper(
    // Safe: the public overload constrains the api to StoreApi<CachedState<TData>, TContext>.
    api.get as () => CachedState<unknown>,
    api.set as (state: CachedState<unknown>) => void,
    api,
    rootOptions
  );
}
