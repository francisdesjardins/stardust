# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

#### `playground`

- `/utilities` route — 8 interactive examples covering every previously undemo'd `@stardust/core` export: `createArrayMethods`, `createStoreDispatch`, `produce`, path utilities (`parsePath` / `getAtPath` / `copyOnWritePath`), `safeAwait`, `createMutex`, `createSingleFlight`, `connectDebugLog`. Each card includes a "View Code" button wired to `codeSamples.ts`.
- `StarfieldBanner` — animated starfield with shooting stars, now rendered on the Getting Started page.
- Sidebar: **Utilities** nav entry positioned between Getting Started and React.

### Fixed

#### `@stardust/react`

- `createStoreContext()` — `cleanup` option renamed to `onUnmount`; default changed from `store.reset()` to `null`. The previous default called `store.reset()` on the public store object, which resolves to any user-defined domain method named `reset` (via `Object.assign` in `createStore`) rather than the built-in baseline restore. In React StrictMode's double-mount cycle the old default fired between mount cycles, silently clobbering the store's initial value. The store is now garbage-collected on true unmount with no automatic teardown; pass `onUnmount` explicitly to handle non-GC resources (timers, sockets).

### Added

#### `@stardust/core`

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
- Async state machine — `AsyncIdle | AsyncPending | AsyncFulfilled<T> | AsyncRejected` discriminated union with `runAsync()` driver and stable `asyncIdle` / `asyncPending` singletons
- `connectDebugLog()` — DEV-only flat-diff debug logger controlled by `localStorage` key `stardust:log`
- Full TypeScript types exported: `Store`, `StoreApi`, `StoreContract`, `StoreSelector`, `AsyncState`, `DerivedStore`, `ArrayMethods`, and more
- Zero runtime dependencies

#### `@stardust/react`

- `useStore()` — `useSyncExternalStore`-backed hook; tear-free, Concurrent Mode safe, supports optional selector and custom equality
- `useSuspenseStore()` — React Suspense protocol hook; throws `Promise` while pending, throws `Error` on rejection, returns `T` on fulfillment
- `createStoreContext()` — React Context factory; each `Provider` mount creates an isolated store instance via lazy `useState` initializer
- React Compiler (`babel-plugin-react-compiler` target `'19'`) applied at build time — no manual `useMemo` / `useCallback` / `React.memo` required

#### `@stardust/solid`

- `useStore()` — `createSignal`-backed reactive hook with `onCleanup` teardown
- `useSuspenseStore()` — `createResource`-driven Suspense hook; maps async states to SolidJS resource lifecycle

#### Infrastructure

- npm workspaces monorepo: `packages/core`, `packages/react`, `packages/solid`, `playground`
- Playwright test suite: unit tests (`*.test.ts`, Node) and component tests (`*.ct.tsx`, Playwright CT / Chromium)
- GitHub Actions CI workflow: lint, format check, type check, unit tests, React component tests (Playwright Docker image)
- Vite build pipeline: ESM + UMD outputs per package, `vite-plugin-dts` for declaration maps
- Benchmarks: Node CLI benchmark suite with stable-run mode and markdown result output
