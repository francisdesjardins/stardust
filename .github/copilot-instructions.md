# Project Guidelines

Stardust — reactive POJO state management for React and SolidJS. Zero runtime dependencies. See [CLAUDE.md](../CLAUDE.md) for deeper context.

## Build and Test

```bash
npm install                              # Install all workspace dependencies
npm run dev                              # Playground dev server (port 3001)
npm run build                            # Build all packages (core + react + solid)
npm run type-check                       # tsc --noEmit across all workspaces
npm run lint                             # ESLint across all source dirs
npm run lint:fix                         # ESLint with auto-fix
npm run format                           # Prettier formatting
npm test                                 # All tests (core unit + react CT + solid unit)
npm run test:unit                        # Unit tests only (core + solid)
npm run bench                            # Store benchmarks (1 round, quick dev check)
npm run bench:stable                     # Fresh baseline (clears history, 10 × 5-round runs)
```

### Per-package test commands

```bash
npx --workspace=packages/core playwright test --project=unit       # core unit tests
npx --workspace=packages/core playwright test --project=component  # core CT tests
npx --workspace=packages/solid playwright test --project=unit      # solid unit tests
```

### Testing conventions

| Suffix        | Runner                   | When to use                         |
| ------------- | ------------------------ | ----------------------------------- |
| `*.test.ts`   | Node (no browser)        | Pure utility functions, store logic |
| `*.ct.tsx`    | Playwright CT (Chromium) | React hooks and components          |
| `*.story.tsx` | — imported by `*.ct.tsx` | Harness/fixture components          |

Test files live in colocated `__tests__/` folders. Every change to `src/` must include tests.

## Packages

| Package           | Entry point    | Purpose                                                           |
| ----------------- | -------------- | ----------------------------------------------------------------- |
| `@stardust/core`  | `src/index.ts` | Store primitives — zero React dependency                          |
| `@stardust/react` | `src/index.ts` | React hooks: `useStore`, `useSuspenseStore`, `createStoreContext` |
| `@stardust/solid` | `src/index.ts` | SolidJS hooks: `useStore`, `useSuspenseStore` (experimental)      |

## Code Style

- **Files**: kebab-case (`create-store.ts`, `use-store.ts`)
- **Exports**: PascalCase types/components, camelCase functions/hooks
- **Imports**: Inline type imports enforced — `import { createStore, type StoreApi } from '@stardust/core'`
- **Optional props**: Always `| undefined` suffix (required by `exactOptionalPropertyTypes`)
- **No `as` casts** — use `Extract<>`, `satisfies`, type predicates
- **Section comments**: Unicode box-drawing — `// ── Section Name ────────────────`

## Architecture

- **State**: POJO-only snapshots, `structuredClone`-compatible. Methods live as closures in the builder — not in the snapshot.
- **React integration**: `useSyncExternalStore` — tear-free, Concurrent Mode safe.
- **SolidJS integration**: `createSignal` + `onCleanup` — reactive primitives, experimental.
- **Context injection**: `TContext` generic + `getContext()` — no singletons.
- **Public API**: All exports from package `src/index.ts` files. Internal utilities are not exported.

## Design Constraints

- **Zero runtime dependencies** — no external packages beyond `react`/`solid-js` peer deps.
- **POJO contract** — snapshots must survive `structuredClone`. No functions, DOM nodes, class instances, or symbols.
- **Structural sharing** — `setByPath` and `createArrayMethods` clone only the path spine; unchanged branches keep reference identity.
- **Lazy derived stores** — `createDerivedStore` subscribes to sources only while it has listeners.

## Debug Logging

Enable in the browser console:

```js
localStorage.setItem('stardust:log', 'store'); // all stores
localStorage.setItem('stardust:log', 'store:counter'); // one store
localStorage.setItem('stardust:log', '*'); // everything
```

`connectDebugLog(store, { name })` — call in playground/dev code; the caller controls when it's active.

## Commits & Changelog

- **Commits**: [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/)
- **Changelog**: Maintain `CHANGELOG.md` per [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), one `## YYYY-MM-DD` block per date

## Playground

One file per example: `playground/src/pages/<route>/examples/<name>.tsx`. Register via `?raw` import in `codeSamples.ts`. SolidJS components must live in `*.solid.tsx` files (dual JSX Vite config). See `playground/CLAUDE.md` for the full guide.
