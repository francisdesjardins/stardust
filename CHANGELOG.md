# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

#### `@stardust/core`

- `createArrayMethods` — redesigned as a two-stage factory: `createArrayMethods<TItem>(defaults)` returns an `ArrayMethodsFactory` with a `.mount(api, path)` method that binds helpers to a specific store and path; providing `TItem` explicitly prevents TypeScript from narrowing literal defaults (e.g. `asyncIdle`), eliminating the need for `as` casts
- `connectDebugLog()` — built-in logger now reports `listeners:N` excluding its own internal debug subscription, while `onLog` receives the raw live listener count at notify time.

### Removed

#### `@stardust/core`

- `createArrayMethods` — removed `methods` builder (4th param) and `ArrayMethodsApi` type; extend the domain API directly using normal domain methods instead
- `ArrayMethodsApi` export removed; replaced by `ArrayMethodsFactory`

### Added

#### `@stardust/core`

- `createArrayMethods` — `update(predicate, partialOrUpdater)` method on `ArrayMethods<TItem>`; patches the first matching item and does nothing when no match is found, preserving structural-sharing array writes; accepts a partial object or updater callback.
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
- React Compiler (`babel-plugin-react-compiler` target `'19'`) applied at build time — no manual `useMemo` / `useCallback` / `React.memo` required

#### `@stardust/solid`

- `useStore()` — `createSignal`-backed reactive hook with `onCleanup` teardown
  - Selector functions now receive the full store as a second argument `(snapshot, store) => ...`, consistent with the React adapter
- `useSuspenseStore()` — `createResource`-driven Suspense hook; maps async states to SolidJS resource lifecycle

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
