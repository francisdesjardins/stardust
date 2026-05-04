<div align="center">

# ✦ Stardust

**Zero-dependency POJO state management.**

Framework-agnostic core with React and SolidJS adapters.

[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61dafb?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![SolidJS](https://img.shields.io/badge/SolidJS-1.8+-4f88c5?style=flat-square&logo=solid&logoColor=white)](https://solidjs.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-d946ef?style=flat-square)](./LICENSE)

</div>

---

## Why Stardust?

- Simple, serializable state (POJO snapshots)
- No runtime dependencies
- Designed for React 19+ and SolidJS 1.8+
- Structural sharing, async state, batching, and more

---

> **Note** — Stardust is a personal learning project, built for exploration and craft. It is not trying to replace or outshine any production-grade state library. The design draws directly from a handful of excellent projects (see below for inspirations).

---

## What It Is

Stardust is a reactive store built around one guarantee: **the snapshot is always a plain, serialisable object**. No proxies. No class instances. No hidden wiring. Just a POJO that survives `structuredClone` — explicit by design, predictable by contract.

Methods live as closures in a builder, not in the snapshot. State and behaviour stay cleanly separated.

```ts
import { createStore } from '@stardust/core';

const counter = createStore({ count: 0 }, ({ update }) => ({
  increment() {
    update((draft) => {
      draft.count += 1;
    });
  },
}));

counter.increment();
counter.getSnapshot(); // { count: 1 }
counter.reset(); // { count: 0 }
```

---

## ✦ Packages

| Package                                                                        | Description                                                                               |
| ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| [`@stardust/core`](./packages/core/README.md)                                  | Zero-dependency store primitives. Runs anywhere — React, SolidJS, Node, plain TypeScript. |
| [`@stardust/react`](./packages/core/README.md#usestorestore-selectororoptions) | React hooks via `useSyncExternalStore` — tear-free, Concurrent Mode safe.                 |
| [`@stardust/solid`](./packages/solid/README.md)                                | SolidJS adapter via `createSignal` + `onCleanup`. Experimental.                           |

---

## ✧ Performance

Benchmarks run with [mitata](https://github.com/evanwashere/mitata) on Node v24.14.1 · AMD Ryzen 7 5800X · 32 GB RAM.
Run `npm run bench` to reproduce locally.

| Operation                        |  ops/s |    ns/op |
| -------------------------------- | -----: | -------: |
| `store.get()` flat snapshot      | 175.1M |     6 ns |
| `store.set()` object swap        |  27.9M |    36 ns |
| `store.getByPath('a.b.c')`       |  11.7M |    85 ns |
| `store.setByPath('a.b.c', v)`    |  12.7M |    79 ns |
| `createDerivedStore` recompute   |   6.6M |   152 ns |
| `arrayMethods.upsert()` hit      |   7.9M |   127 ns |
| `store.update()` draft mutation  |   800K | 1,263 ns |
| `produce()` flat clone + mutate  |   790K | 1,275 ns |
| `batch()` 10× writes, 1 listener |   500K | 2,109 ns |
| fan-out: 1,000 listeners         |   192K | 5,219 ns |

The hot path — `get()`, `set()`, `setByPath()` — sits in the single-digit to double-digit nanosecond range, well clear of anything a UI can saturate. `update()` and `produce()` cost what `structuredClone` costs: that's the POJO contract, paid explicitly, nothing hidden. `AsyncState` and `CachedState` are plain fields in the snapshot — no hidden scheduler, no extra layer. If you need more control over cost, reach for `set()` or `setByPath()` directly; the primitives are always there.

> `dispatch()` overhead vs direct calls is zero — same ns/op at every tier.
> Numbers are machine-specific. _Last updated: 2026-05-03_

---

## ★ Core Concepts

### POJO-only snapshots

The snapshot must survive `structuredClone`. Functions, class instances, DOM nodes, and symbols are not allowed inside state. This constraint is intentional — it keeps state serialisable, testable, and inspectable at all times.

### Structural sharing

`setByPath` and array helpers clone only the path spine. Unchanged branches keep reference identity — selectors bail out early, re-renders stay minimal.

### Selector-based subscriptions

```ts
import { useStore } from '@stardust/react';

// Re-renders only when `count` changes
const count = useStore(counter, (s) => s.count);

// Object selector with shallow equality — re-renders only when x or y change
import { shallowEqual } from '@stardust/core';
const pos = useStore(store, { select: (s) => ({ x: s.x, y: s.y }), equals: shallowEqual });
```

### Context injection — no singletons

```ts
type ApiClient = { fetchUser(id: string): Promise<User> };

const userStore = createStore<UserState, UserMethods, ApiClient>(
  { user: null },
  ({ update, getContext }) => ({
    async load(id: string) {
      const api = getContext(); // injected at the React boundary
      const user = await api.fetchUser(id);
      update((d) => {
        d.user = user;
      });
    },
  })
);

// In React — inject context at mount time
useStore(userStore, { context: apiClient });
```

### Async state — no manual status flags

```ts
import { asyncIdle, asyncPending, asyncFulfilled, asyncRejected, runAsync } from '@stardust/core';
import { useSuspenseStore } from '@stardust/react';

// Snapshot shape
const store = createStore({ data: asyncIdle as AsyncState<User> }, ({ update, getContext }) => ({
  async load(id: string) {
    await runAsync(
      () => getContext().fetchUser(id),
      (state) => update((d) => { d.data = state; }),
    );
  },
}));

// Component — Suspense and ErrorBoundary handle the rest
function UserCard() {
  const user = useSuspenseStore(store, (s) => s.data);
  return <div>{user.name}</div>;
}
```

---

## ✧ More Capabilities

<details>
<summary><strong>Derived stores</strong> — computed values that update lazily</summary>

```ts
import { createDerivedStore, shallowEqual } from '@stardust/core';

const summary = createDerivedStore(
  [userStore, settingsStore],
  (user, settings) => ({ name: user.name, theme: settings.theme }),
  { equals: shallowEqual }
);
```

Subscribes to sources only while it has listeners — zero overhead when unused.

</details>

<details>
<summary><strong>Dispatch pattern</strong> — controlled mutation interface</summary>

```ts
import { createStoreDispatch } from '@stardust/core';

const dispatch = createStoreDispatch(counter);
dispatch('increment'); // only domain methods reachable
```

</details>

<details>
<summary><strong>React context stores</strong> — scoped instances, no prop drilling</summary>

```ts
import { createStoreContext } from '@stardust/react';

const CounterCtx = createStoreContext(
  () => createStore({ count: 0 }, ({ update }) => ({
    increment() { update((d) => { d.count += 1; }); },
  })),
  { name: 'Counter' },
);

<CounterCtx.Provider>
  <Counter />
</CounterCtx.Provider>

function Counter() {
  const count = CounterCtx.useSnapshot((s) => s.count);
  const store = CounterCtx.useStoreContext();
  return <button onClick={store.increment}>{count}</button>;
}
```

</details>

<details>
<summary><strong>Concurrency utilities</strong> — single-flight & mutex</summary>

```ts
import { createSingleFlight, createMutex, safeAwait } from '@stardust/core';

// Deduplicate concurrent calls — one request, N callers resolved together
const loadFlight = createSingleFlight();
const load = () => loadFlight(() => fetch('/api/config'));

// Serialize concurrent calls — N calls run N times, one at a time
const mutex = createMutex();
const save = () => mutex(() => fetch('/api/save', { method: 'POST' }));
```

</details>

<details>
<summary><strong>Path utilities</strong> — typed reads and writes</summary>

```ts
store.getByPath('user.address.city'); // typed read
store.setByPath('user.address.city', 'Quebec'); // structural sharing write
```

</details>

<details>
<summary><strong>Non-React observation</strong> — works anywhere</summary>

```ts
import { watch } from '@stardust/core';

const unsub = watch(
  store,
  (s) => s.count,
  (next, prev) => {
    console.log('count', prev, '→', next);
  }
);

unsub(); // stop watching
```

Zero React imports — safe for Node, plain TypeScript, Vue, Svelte, or any other environment.

</details>

<details>
<summary><strong>SolidJS adapter</strong> — experimental</summary>

```ts
import { useStore } from '@stardust/solid';

function Counter() {
  const count = useStore(counterStore, (s) => s.count);
  return <span>{count()}</span>; // SolidJS signal accessor
}
```

</details>

---

## ★ Debug Logging

No browser extension required. Activate from the console:

```js
localStorage.setItem('stardust:log', 'store'); // all stores
localStorage.setItem('stardust:log', 'store:counter'); // one store
```

```ts
if (import.meta.env.DEV) {
  connectDebugLog(store, { name: 'counter' });
}
```

The built-in logger prints `listeners:N` excluding its own internal debug subscription, while the optional `onLog` callback receives the raw live listener count at notify time.

---

## ✦ Monorepo Structure

```
packages/
  core/     — @stardust/core   — zero-dep store primitives
  react/    — @stardust/react  — React hooks
  solid/    — @stardust/solid  — SolidJS adapter (experimental)
playground/ — interactive demos and benchmarks
benchmarks/ — nanosecond-precision performance suite
```

---

## ✧ Requirements

| Runtime    | Version                                    |
| ---------- | ------------------------------------------ |
| Node       | ≥ 24                                       |
| React      | ^19.2.4 (peer dep, `@stardust/react` only) |
| SolidJS    | ≥ 1.8 (peer dep, `@stardust/solid` only)   |
| TypeScript | strict mode recommended                    |

---

## ★ Development

```bash
npm install          # install all workspace dependencies
npm run dev          # playground dev server — localhost:3001
npm run build        # build all packages
npm run type-check   # TypeScript check across all workspaces
npm run lint         # ESLint
npm test             # all tests
npm run bench        # performance benchmarks
```

---

## ✦ License

[MIT](./LICENSE) © [Francis Desjardins](https://francisdesjardins.ca)

---

<div align="center">

✦ &nbsp; ✧ &nbsp; ★ &nbsp; · &nbsp; ✦ &nbsp; · &nbsp; · &nbsp; ✧ &nbsp; ★ &nbsp; ✦

_Explicit by design. Magical by reputation._

</div>
