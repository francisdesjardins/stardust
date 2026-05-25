# Stardust × React

**Zero-dependency POJO state management for React.**

This package provides React hooks and context helpers for Stardust stores, enabling tear-free, concurrent-safe state management in React 19+.

## Why use this package?

- Simple, serializable state (POJO snapshots)
- No runtime dependencies beyond React
- Built on `useSyncExternalStore` for concurrent safety
- Supports selectors, context injection, and async state

## Installation

```bash
npm install @stardust/react
```

## Basic Usage

```tsx
import { createStore } from '@stardust/core';
import { useStore } from '@stardust/react';

const counter = createStore({ count: 0 }, ({ update }) => ({
  increment() {
    update((d) => {
      d.count++;
    });
  },
}));

function Counter() {
  const count = useStore(counter, (s) => s.count);
  return <button onClick={counter.increment}>{count}</button>;
}
```

## Hooks

### `useStore(store, selector?, equals?)`

Subscribe to a Stardust store with optional selector and custom equality.

```tsx
// Full snapshot
const snap = useStore(store);

// With selector
const count = useStore(store, (s) => s.count);

// With selector + custom equality
const user = useStore(store, (s) => ({ ...s.user }), shallowEqual);
```

Selector functions receive the snapshot **and** the full store, so domain methods are accessible without closing over the store:

```tsx
const total = useStore(pricingStore, (s, store) => store.actions.computeTotal());
```

### `useStoreCachedSlice(store, path, { select?, equals? })`

Subscribe to a cached slice (e.g., `CachedState<T>`) with automatic reference counting for multi-component coordination.

```tsx
import { useStoreCachedSlice } from '@stardust/react';
import { getCachedData } from '@stardust/core';

const cached = useStoreCachedSlice(store, 'api.data');

// With selector to reshape by status
const data = useStoreCachedSlice(store, 'api.data', {
  select: (cached, data) => {
    if (cached.status === 'fresh' || cached.status === 'expired') {
      return data;
    }
    if (cached.status === 'pending') {
      return undefined;
    }
    return null;
  },
});
```

**Key behaviors:**

- **Reference counting**: multiple components using the same cached slice coordinate via a WeakMap. Only the first mount calls `startAutoRefresh()`, and only the last unmount calls `stopAutoRefresh()`.
- **Idle → expired transition**: automatically transitions `idle → expired` on mount (when auto-refresh is configured) to trigger `onExpire` flows.
- **Selector receives both union and data**: selectors get `(cached: CachedState<T>, data: T | undefined)` to support rich status-aware selections without re-extracting data.

### `useSuspenseStore(store, selector?)`

Subscribe to async state with React Suspense. Throws a `Promise` while pending, throws an `Error` when rejected, returns `T` when fulfilled.

```tsx
import { useSuspenseStore } from '@stardust/react';

function UserProfile({ userId }: { userId: number }) {
  const user = useSuspenseStore(store, (s) => s.user);
  return <h1>{user.name}</h1>;
}

export function Page() {
  return (
    <Suspense fallback={<Spinner />}>
      <UserProfile userId={1} />
    </Suspense>
  );
}
```

## API Reference

> API Reference will be auto-generated from JSDoc in a future release.

## License

MIT — see [LICENSE](../../LICENSE)

## Contributing

Contributions welcome! Please see the monorepo README for guidelines.
