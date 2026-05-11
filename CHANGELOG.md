# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

#### `@stardust/core`

- **`createStore` — actions callback is now optional** — `createStore(snapshot)` and `createStore(snapshot, options)` are now valid. Omitting the callback gives access to built-ins only (`set`, `update`, `reset`, `batch`, `getByPath`, `setByPath`, `run`); `store.actions` is typed as an empty object.
- **`createSingleFlight` — `mode` option** — accepts `{ mode: 'first' | 'last' }`. `'first'` (default) preserves existing behaviour. `'last'` makes each new call supersede the previous: the superseded task's `AbortSignal` is aborted immediately, and all concurrent waiters share a single deferred that resolves with the last task's result — useful for search/autocomplete patterns.
- **`SingleFlightTask<T>`** — task signature is now `(signal: AbortSignal) => Promise<T>`. Callers that do not need the signal can ignore the parameter; existing `() => Promise<T>` thunks remain assignable (TypeScript allows fewer-parameter callbacks).
- **`createFirstFlight()` / `createLastFlight()`** — named convenience factories for each mode.

### Changed

#### `@stardust/core`

- **`createStore()` builder signature** — the factory callback now returns `{ readonly actions: TMethods }` instead of a flat object. Domain methods are accessed at `store.actions.*` instead of `store.*`. All built-ins (`set`, `update`, `reset`, `subscribe`, `getSnapshot`, `getByPath`, `setByPath`, `batch`, `setContext`, `run`) remain flat on the store object. This eliminates shadowing concerns and simplifies domain-method detection in `connectDebugLog` and `createStoreDispatch`.
- **`Store<TSnapshot, TMethods, TContext>` type** — now includes `readonly actions: TMethods` property instead of spreading methods onto the store root. The type structure is `{ set, update, ..., actions, ... }` with clear namespace separation.
- **`createStoreDispatch()` domain restriction** — now only supports dispatching domain actions from `store.actions`. The `NON_DOMAIN_KEYS` filtering is removed; domain methods are identified by iterating `store.actions` directly at construction time. Built-in exposure options (`canDispatchSet`, etc.) are no longer supported — use the built-in methods directly (e.g. `store.set(...)` or `store.update(...)`). The `domain` option still filters which actions are dispatchable.
- **`createStoreDispatch()` leaf-path support** — domain methods are flattened at construction time via `flattenLeaves()`, allowing nested actions to be dispatched via dot-notation (e.g. `dispatch('todos.add', text)` for `store.actions.todos.add(text)`). Type-level `LeafPaths<TMethods>` extracts all leaf function paths; `LeafAt<T, Path>` resolves function types at dot-notation paths for full type safety.
- `createCachedSlice` — `stopAutoRefresh()` no longer clears the expiry timer. The `'fresh'` → `'expired'` transition fires and notifies subscribers regardless of auto-refresh state, making expiry fully observable even when automatic re-fetching is disabled. Call `expire()` explicitly if you need to cancel the timer and immediately mark the cache as expired.
- `createCachedSlice` — `startAutoRefresh()` now immediately triggers the `refreshOnExpire` fetch when the cache is already `'expired'` at call time, instead of being a no-op (previously `scheduleExpiryTimer` returned early for non-`'fresh'` states).
- `createCachedSlice` — **`expire` option removed** from `CachedOptions`; TTL is now expressed directly on the data via `cachedFresh(data, expiresAt)`, `set(data, expiresAt)`, and `refresh(fetcher, { expiresAt })`. `startAutoRefresh({ interval })` replaces the `expire` option as the source of the recurring TTL for auto-refresh cycles — it stamps `expiresAt = Date.now() + interval` on each refreshed value and drives the first expiry when the initial state has no `expiresAt`. This removes the awkward duplication between the option and the initial `cachedFresh` timestamp.
- `createCachedSlice` — `set(data)` now accepts an optional second argument `expiresAt?: number`. When omitted, the result has no TTL and stays fresh indefinitely. When provided, the expiry timer is scheduled at that absolute timestamp.
- `createCachedSlice` — `refresh(fetcher, opts?)` now accepts `expiresAt?: number` in `CachedRefreshOptions`. Stamps the TTL on the `CachedFresh` result.
- `createCachedSlice` — **breaking redesign**: the managed store field now holds a `CachedState<T>` discriminated union (`CachedIdle | CachedPending<T> | CachedFresh<T> | CachedExpired<T> | CachedRejected<T>`) instead of raw `T`. Cache status is now fully observable via `watch` and `createDerivedStore` — expiry fires into the snapshot. Use `cachedFresh(data)` as the initial store value; it returns `CachedState<T>` (wide union) so TypeScript infers `TSnapshot` correctly.
- `createCachedSlice` — `set(data)` now always writes `cachedFresh`; the updater-function overload is removed.
- `createCachedSlice` — `refresh(fetcher)` fetcher signature changed to `(current: TValue | undefined) => Promise<TValue>` (void return is no longer accepted). Transitions snapshot through `cachedPending → cachedFresh` on success, `cachedPending → cachedRejected` on error.
- `createCachedSlice` — expiry timer is now **scheduled at construction** when the initial state is `'fresh'` and has a non-`undefined` `expiresAt`; on firing, the snapshot transitions to `CachedExpired<T>` (observable). `startAutoRefresh({ interval })` additionally enables automatic re-fetch on expiry.
- `createCachedSlice` — `stopAutoRefresh()` sets `autoRefreshEnabled = false`, preventing any in-flight `refreshOnExpire` callback from rescheduling after stop.
- `createCachedSlice` — `refreshOnExpire` now receives `(current: TValue | undefined, api)` and must return `Promise<TValue>` (void pattern removed).
- `createArrayMethods` — redesigned as a two-stage factory: `createArrayMethods<TItem>(defaults)` returns an `ArrayMethodsFactory` with a `.mount(api, path)` method that binds helpers to a specific store and path; providing `TItem` explicitly prevents TypeScript from narrowing literal defaults (e.g. `asyncIdle`), eliminating the need for `as` casts
- `connectDebugLog()` — built-in logger now reports `listeners:N` excluding its own internal debug subscription, while `onLog` receives the raw live listener count at notify time.

### Added

#### `@stardust/core`

- **`store.run(actionName, fn)`** — built-in method that executes an untracked mutation within a named action scope. Useful for external code (e.g., `watch` callbacks, event handlers outside domain methods) that needs to mutate the store without triggering an "untracked mutation" warning from `connectDebugLog`. `connectDebugLog` wraps `run()` to set `currentAction` for the duration, ensuring the mutation is logged and tracked. When called inside a domain method, the outer action name takes precedence.

### Removed

#### `@stardust/core`

- **`BuiltinDispatchable` and `DispatchableActions` type exports** — removed from `createStoreDispatch` as they are no longer relevant; `createStoreDispatch` now only supports domain actions from `store.actions`.
- `createCachedSlice` — `isExpired()` removed; use `cache.get().status === 'expired'` instead.
- `createCachedSlice` — `markFresh()` removed; the cache writes `cachedFresh` directly after a successful `refresh()`.
- `createArrayMethods` — removed `methods` builder (4th param) and `ArrayMethodsApi` type; extend the domain API directly using normal domain methods instead
- `ArrayMethodsApi` export removed; replaced by `ArrayMethodsFactory`

### Added

#### `@stardust/core`

- `CachedState<T>` discriminated union and constructors: `cachedIdle`, `cachedPending<T>()`, `cachedFresh<T>(data, expiresAt?)`, `cachedExpired<T>(data, expiresAt)`, `cachedRejected<T>(error, data?)`. Exported from `@stardust/core`.
- `getCachedData<T>(state: CachedState<T>): T | undefined` — utility to safely extract data from any `CachedState<T>` variant.
- `createCachedSlice` — `expire()` public method: manually transitions `fresh → expired` immediately, making it observable in `watch` / `createDerivedStore`.

- `createArrayMethods` — `update(predicate, partialOrUpdater)` method on `ArrayMethods<TItem>`; patches the first matching item and does nothing when no match is found, preserving structural-sharing array writes; accepts a partial object or updater callback.
- `createCachedSlice` — `placeholder` option on `CachedOptions`; committed before the fetch begins when `keepPreviousData` is `false`; `keepPreviousData: true` and `placeholder` are mutually exclusive — TypeScript enforces this at the call site via a discriminated union. Applies to both manual `refresh()` calls (as a helper-level default) and the auto-refresh timer.
- `createCachedSlice` — benchmarks: 10 cases covering `get()`, `set()` (equality bypass and write+notify with 0/1/10 listeners), `isExpired()` both paths, and slice variants.
- `createArrayMethods` — `upsert(needle, predicate)` method on `ArrayMethods<TItem>`; replaces the first item for which `predicate` returns `true` (with `this` bound to the needle), or appends if no match; accepts a single item or an array of items — batch upserts produce one store notification; predicate must be a `function` expression, not an arrow function
- `store.listenerCount` — read-only getter on `Store` and `DerivedStore` that returns the number of active subscribers; O(1) read backed by `listeners.size`; useful for skipping expensive work when no one is watching (e.g. `if (store.listenerCount > 0) { … }`)
- `createStore()` options — `context` field lets you seed the store's context at creation time instead of calling `store.setContext()` separately; `setContext()` still overwrites it at any point later
- `createStore()` — POJO store factory with snapshot-based state, `get`, `set`, `update`, `dispatch`, and `subscribe`
- `createStoreSubscription()` — low-level subscription primitive shared by stores and derived stores
- `createDerivedStore()` — lazily-subscribed derived store that recomputes on source mutations with structural sharing
- `createArrayMethods()` — collection of immutable array helpers (append, prepend, remove, replace, move, …) built on `setByPath`
- `createStoreDispatch()` — typed action dispatcher for reducer-style updates
- `watch()` — pure observer (no React dependency) that fires only on change, overloaded for full snapshot or selector
- `produce()` — standalone `structuredClone`-based mutable recipe utility; used internally by `store.update()`
- `batch()` — defers listener notifications until the outermost batch completes
- `setByPath()` / `getByPath()` — structural-sharing path utilities; clone only the mutation spine
- `shallowEqual()` — shallow equality helper exported for consumer use
- `safeAwait()`, `createMutex()`, `createSingleFlight()` — async concurrency utilities
- Async state machine — `AsyncIdle | AsyncPending | AsyncFulfilled<T> | AsyncRejected` discriminated union with `runAsync()` driver and stable `asyncIdle` / `asyncPending` singletons
- `connectDebugLog()` — DEV-only flat-diff debug logger controlled by `localStorage` key `stardust:log`
- Full TypeScript types exported: `Store`, `StoreApi`, `StoreContract`, `StoreSelector`, `AsyncState`, `DerivedStore`, `ArrayMethods`, and more
- Zero runtime dependencies

#### `@stardust/react`

- `useStore()` — `useSyncExternalStore`-backed hook; tear-free, Concurrent Mode safe, supports optional selector and custom equality
  - Selector functions now receive the full store as a second argument `(snapshot, store) => ...` — domain methods are accessible without closing over the store variable, particularly useful with `createStoreContext`
- `useSuspenseStore()` — React Suspense protocol hook; throws `Promise` while pending, throws `Error` on rejection, returns `T` on fulfillment
- `createStoreContext()` — React Context factory; each `Provider` mount creates an isolated store instance via lazy `useState` initializer
  - `useSnapshot` selector now also receives the store as a second argument `(snapshot, store) => ...`
- `useStoreCachedSlice()` — hook to subscribe to a cached slice with automatic reference counting for `startAutoRefresh` / `stopAutoRefresh`
  - Coordinates auto-refresh across multiple components — only the first mount calls `startAutoRefresh()`, only the last unmount calls `stopAutoRefresh()`
  - Automatically transitions `idle → expired` on mount when auto-refresh is configured, triggering `refreshOnExpire` flows
  - Uses WeakMap to track per-Cached-instance reference counts; maintains a cache of selected values for tearing prevention
  - Selector functions receive both the full `CachedState<T>` discriminated union and the extracted data (via `getCachedData()`), allowing rich status-aware selections
- React Compiler (`babel-plugin-react-compiler` target `'19'`) applied at build time — no manual `useMemo` / `useCallback` / `React.memo` required

#### `@stardust/solid`

- `useStore()` — `createSignal`-backed reactive hook with `onCleanup` teardown
  - Selector functions now receive the full store as a second argument `(snapshot, store) => ...`, consistent with the React adapter
- `useSuspenseStore()` — `createResource`-driven Suspense hook; maps async states to SolidJS resource lifecycle

### Fixed

#### playground

- `cache-loading` — section headers ("placeholder" / "keepPreviousData") were empty; labels restored.
- `cache-nested` — caption incorrectly claimed `expire()` immediately triggers `refreshOnExpire`; corrected. Added Start/Stop auto-refresh buttons so `refreshOnExpire` is actually exercised in the example.
- Extracted shared `cachedStatusColor` map from all four cache examples into `@/entities/example` to eliminate copy-paste duplication.

#### `@stardust/core` (tests)

- `expire()` is a no-op when state is `'idle'`, `'pending'`, or `'rejected'` — added explicit coverage.
- `refresh()` called while already `'pending'` shares the in-flight promise — the second fetcher is never invoked — added explicit coverage.

### Added

#### `playground`

- `/utilities` route — 8 interactive examples covering every previously undemo'd `@stardust/core` export: `createArrayMethods` (grocery list using all five methods incl. `setByPath`), `createStoreDispatch` (sequence loop showing string-keyed dispatch + restricted `safeDispatch`), `produce`, path utilities (`parsePath` segment visualisation, `getAtPath` live readout, `copyOnWritePath` structural sharing), `safeAwait`, `createMutex` (done/running/queued badge with gate-state caption), `createSingleFlight` (all caller chips resolve simultaneously), `connectDebugLog` (custom `onLog` driving a live diff panel). Each card includes a "View Code" button.
- `StarfieldBanner` — animated starfield with shooting stars, rendered on the Getting Started page.
- Sidebar: **Utilities** nav entry positioned between Getting Started and React.

#### Infrastructure

- npm workspaces monorepo: `packages/core`, `packages/react`, `packages/solid`, `playground`
- TypeDoc support — `npm run docs:api` generates unified HTML API reference at `docs/api/` for all three public packages; per-package `typedoc.json` files declare entry points and suppress warnings for intentionally internal types
- Playwright test suite: unit tests (`*.test.ts`, Node) and component tests (`*.ct.tsx`, Playwright CT / Chromium)
- GitHub Actions CI workflow: lint, format check, type check, unit tests, React component tests (Playwright Docker image)
- Vite build pipeline: ESM + UMD outputs per package, `vite-plugin-dts` for declaration maps
- Benchmarks: Node CLI benchmark suite with stable-run mode and markdown result output

### Changed

#### `@stardust/core`

- JSDoc normalized across `createStore`, `createDerivedStore`, `createStoreDispatch`, and `createArrayMethods`: consistent `@template`, `@param`, and `@returns` tags; multi-example blocks use `<caption>` labels; cross-package `{@link}` replaced with inline code where the target is outside `@stardust/core`

#### `@stardust/react`

- JSDoc normalized across `useStore`, `useSuspenseStore`, and `createStoreContext`: consistent `@template`, `@param`, and `@returns` tags; `@param` names aligned with overload parameter names to eliminate TypeDoc warnings

#### `@stardust/solid`

- JSDoc normalized across `useStore` and `useSuspenseStore`: consistent `@template`, `@param`, and `@returns` tags

#### Root

- `package.json` scripts reordered: `dev` → build group → playground group → quality (`type-check`, lint, format) → `test`, `bench` → `docs:api` → `ncu`; redundant `bootstrap` script removed (covered by `npm install` at root in a workspaces monorepo)

### Fixed

#### `@stardust/react`

- `createStoreContext()` — `cleanup` option renamed to `onUnmount`; default changed from `store.reset()` to `null`. The previous default called `store.reset()` on the public store object, which resolves to any user-defined domain method named `reset` (via `Object.assign` in `createStore`) rather than the built-in baseline restore. In React StrictMode's double-mount cycle the old default fired between mount cycles, silently clobbering the store's initial value. The store is now garbage-collected on true unmount with no automatic teardown; pass `onUnmount` explicitly to handle non-GC resources (timers, sockets).
