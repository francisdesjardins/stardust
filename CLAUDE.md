# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Reactive state library — framework-agnostic core + React adapter + SolidJS adapter + playground.

## Packages

| Package           | Description                                                                                                                                        |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@stardust/core`  | Zero-dep store primitives: `createStore`, `watch`, `createDerivedStore`, async state, path utils, `safeAwait`, `createMutex`, `createSingleFlight` |
| `@stardust/react` | React hooks: `useStore`, `useSuspenseStore`, `createStoreContext`                                                                                  |
| `@stardust/solid` | SolidJS adapter: `useStore`, `useSuspenseStore`                                                                                                    |
| `playground`      | Interactive demo app (private, not published)                                                                                                      |

## Commands

```bash
npm install              # Install all workspace dependencies
npm run dev              # Dev server for playground (localhost:3000)
npm run build            # Build all packages (core → react → solid, in order)
npm run build:core       # Build @stardust/core only
npm run build:react      # Build @stardust/react only
npm run build:solid      # Build @stardust/solid only
npm run type-check       # TypeScript check across all workspaces
npm run lint:fix         # Lint and auto-fix
npm run format           # Format code
npm test                 # All tests (core unit + react CT)
npm run bench            # Store benchmarks (1 round, quick dev check)
npm run bench:stable     # Fresh baseline (clears history, 10 × 5-round runs)
npm run ncu              # Check for dependency updates (dry run)
npm run ncu:update       # Update all workspace package.json files to latest
```

## Testing

Playwright for unit + component tests — **not** Jest or Vitest.

```bash
# From packages/core or packages/react:
npm test                 # All tests
npm run test:unit        # Unit tests only (*.test.ts)
npm run test:component   # Component tests only (*.ct.tsx) — react package only
```

| Suffix        | Purpose                                 |
| ------------- | --------------------------------------- |
| `*.test.ts`   | Unit tests — pure functions, no browser |
| `*.ct.tsx`    | Component tests — Playwright CT         |
| `*.story.tsx` | Harness components imported by CT tests |

Tests are colocated in `__tests__/` next to the file under test. Each package defines its own inline helpers (e.g. `makeCounter()`) — there is no shared fixture library.

**Every change to `packages/*/src/` must ship with tests.**

### Benchmarks

Node CLI at `benchmarks/` — runs from the monorepo root. Resolves `@stardust/core` via `tsconfig.node.json` paths (no prior build needed).

```bash
npm run bench            # Run benchmarks (mitata handles warmup + sample collection)
```

Powered by [mitata](https://github.com/evanwashere/mitata). Results written to `benchmarks/results/latest.json` (gitignored) and consumed by the playground Lab tab via `vite-plugin-bench`. Each definition file in `benchmarks/definitions/` uses the generator pattern (`function*`) to separate setup from the measured hot path.

## Architecture

### Core primitives (`packages/core/src/`)

`createStore()` produces a snapshot object + domain methods. The low-level plumbing (`subscribe` / `getSnapshot` / `emit` / `notify`) lives in `createStoreSubscription()`, which both `createStore` and `createDerivedStore` build on.

Key relationships:

- **`produce(state, recipe)`** — standalone utility that clones via `structuredClone` and applies a mutable recipe. `store.update(recipe)` calls it internally; callers can also invoke it directly for one-off transforms.
- **`watch(store, selector?, cb)`** — pure observer with no React dependency. Fires only on change (never immediately). Overloaded for full snapshot or selector.
- **`createDerivedStore(sources, derive)`** — recomputes on source mutation with **lazy subscription** (sources only subscribed while the derived store has active listeners). Calls `setSnapshot` silently on first subscribe to avoid React tear-detection loops.
- **`setByPath()`** — uses structural sharing: shallow-copies only the mutation path spine; unchanged subtrees keep reference identity.
- **`batch(fn)`** — increments a depth counter; listeners are deferred until depth returns to zero.

All mutations short-circuit notification when `equals(prev, next)` returns `true` (default `Object.is`).

**POJO constraint**: all values in the snapshot must survive `structuredClone`. Functions, class instances, DOM nodes, and symbols are not permitted.

### React adapter (`packages/react/src/`)

`useStore()` is built on `useSyncExternalStore`. To avoid React error #185 (infinite tear-detection):

- The selected value is cached in a `useRef`. The `subscribe` wrapper checks equality before calling the listener; `getSnapshot` returns the cached reference when data is unchanged.
- Context is injected via `setContext()` before the `useSyncExternalStore` subscribe call, so store methods receive it synchronously from the first render.

`createStoreContext()` wraps a factory in React Context. Each `Provider` mount creates a fresh store instance (via `useState` lazy initializer); the store is garbage-collected on unmount. An optional `onUnmount` hook handles explicit teardown of non-GC resources (timers, sockets). Default is `null` — do not pass `store.reset()` here as it resolves to any user-defined domain method of that name, not the built-in baseline restore.

`useSuspenseStore()` implements the React Suspense protocol: throws a `Promise` while idle/pending, throws an `Error` when rejected, returns `T` when fulfilled. A `WeakMap` caches pending promises to avoid creating a new one per render.

### SolidJS adapter (`packages/solid/src/`)

Minimal bridge — no memoization cache needed because SolidJS handles it natively:

- `useStore()` creates a `createSignal` with the selected value and custom `equals` as signal options. Store updates call `setSnapshot(() => sel(...))`. `onCleanup` manages teardown.
- `useSuspenseStore()` drives a `createResource` whose source is the `useStore` signal. Fulfilled → `Promise.resolve(data)`; rejected → `Promise.reject(error)`; idle/pending → a never-resolving `Promise`.

### Async state (`packages/core/src/async-state.ts`)

Discriminated union: `AsyncIdle | AsyncPending | AsyncFulfilled<T> | AsyncRejected`. Singletons `asyncIdle` and `asyncPending` are referentially stable. `runAsync(fetcher, onState)` drives the state machine, calling `onState` at each stage so the store update is the caller's responsibility.

### Playground (`playground/src/`)

React app using Feature-Sliced Design, TanStack Router, MUI, and a `ThemeProvider` / `CodePaneProvider`. Routes: `/getting-started`, `/react`, `/solid`, `/lab` (benchmarks).

**Dual JSX**: `.solid.tsx` files → `vite-plugin-solid`; everything else → `@vitejs/plugin-react`. The two plugins use mutually exclusive `include`/`exclude` filters in `playground/vite.config.ts`.

SolidJS examples are **islands** mounted by React via `useEffect`:

1. Create `playground/src/pages/solid/examples/<name>.solid.tsx` — pure SolidJS component
2. Create a React wrapper that mounts it via `render` from `solid-js/web` inside `useEffect`
3. Return the `dispose` function from `useEffect` for cleanup (safe for React 19 StrictMode)

**Path aliases** resolve packages to source at dev time — no prior build needed:

- `@/*` → `playground/src/*`
- `@stardust/core|react|solid` → `packages/{core,react,solid}/src/index.ts`

**Build**: per-package Vite configs for ESM (`vite.config.esm.ts`) and UMD (`vite.config.umd.ts`). Build order must be `core → react → solid`.

### Debug logging

`connectDebugLog(store, { name })` computes a flat diff of changed paths and logs via a `localStorage`-keyed logger (`stardust:log=store` or `stardust:log=store:<name>`). A custom `onLog` handler is supported. DEV-only; tree-shaken in production.

## Conventions

- **Commits**: [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/)
- **Changelog**: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), one `## YYYY-MM-DD` block per date
- **Files**: kebab-case. **Exports**: PascalCase types/components, camelCase functions/hooks
- **Optional props**: `| undefined` suffix (`onClose?: ((r: Result) => void) | undefined`)
- **Type safety**: No `as` casts — use `Extract<Source, Target>` for narrowing, `satisfies` to prevent widening. `ts-reset` active.

## Key Constraints

- **React Compiler** (`babel-plugin-react-compiler`, target `'19'`): No `useMemo`/`useCallback`/`React.memo`. No ref writes during render.
- **TypeScript strict**: `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noPropertyAccessFromIndexSignature`
- **Environment**: Node >=24 | React ^19.2.4 | SolidJS >=1.8 | Chrome 138+ | ES2024
