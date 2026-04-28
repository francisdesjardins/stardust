<div align="center">

# Stardust × SolidJS

**Zero-dependency POJO state management for SolidJS.**

Bridges Stardust stores into SolidJS reactive primitives. Requires `solid-js` installed in your project.

</div>

---

> **Experimental.** API may change.

---

## Why use this package?

- Simple, serializable state (POJO snapshots)
- No runtime dependencies beyond SolidJS
- Idiomatic SolidJS reactivity (`createSignal`, `onCleanup`)
- Supports selectors, async state, and Suspense integration

## Installation

```bash
npm install @stardust/solid
```

## Basic Usage

```tsx
import { createStore } from '@stardust/core';
import { useStore } from '@stardust/solid';

const counter = createStore({ count: 0 }, ({ update }) => ({
  increment() {
    update((d) => {
      d.count++;
    });
  },
}));

function Counter() {
  const count = useStore(counter, (s) => s.count);
  return <button onClick={counter.increment}>{count()}</button>;
}
```

## API Reference

> API Reference will be auto-generated from JSDoc in a future release.

## License

MIT — see [LICENSE](../../LICENSE)

## Contributing

Contributions welcome! Please see the monorepo README for guidelines.

## API

### `useStore(store)`

Returns a SolidJS signal accessor `() => TSnapshot`. Subscribes to the store and updates the signal on every emission.

### `useStore(store, select, equals?)`

Returns a signal accessor `() => TSlice`. The signal only updates when `equals(prev, next)` returns `false` (default `Object.is`). Pass `shallowEqual` from `@stardust/core` when your selector returns a new object literal on every call.

### `useSuspenseStore(store, select)`

Returns a resource accessor `() => T` that integrates with SolidJS `<Suspense>` and `<ErrorBoundary>`.

| `AsyncState` status | Behaviour                                    |
| ------------------- | -------------------------------------------- |
| `fulfilled`         | Resource resolves to `T`                     |
| `rejected`          | Resource rejects — `<ErrorBoundary>` catches |
| `idle` / `pending`  | Suspends — `<Suspense fallback>` renders     |

```tsx
import { useSuspenseStore } from '@stardust/solid';

function UserProfile() {
  const user = useSuspenseStore(userStore, (s) => s.user);
  return <div>{user().name}</div>;
}

<ErrorBoundary fallback={(e) => <p>{e.message}</p>}>
  <Suspense fallback={<p>Loading…</p>}>
    <UserProfile />
  </Suspense>
</ErrorBoundary>;
```

## How it works

- `useStore` — `createSignal` + `onCleanup` to unsubscribe when the reactive scope is disposed.
- `useSuspenseStore` — wraps `useStore` with `createResource`, using the `AsyncState` signal as the source. When the state is `idle`/`pending` the fetcher returns a never-resolving Promise so `<Suspense>` waits; when the store emits a `fulfilled` or `rejected` update the source signal changes and the resource re-fetches immediately.
