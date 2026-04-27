# Stardust — TL;DR

Reactive state management outside React. Works with `useSyncExternalStore` — no dependencies.

## The 30-second version

```ts
import { createStore, useStore } from '@stardust/core';

// 1. Create a store with state + methods
const counter = createStore(
  { count: 0 },
  ({ update }) => ({
    increment: () => update(d => { d.count += 1; }),
    reset: () => update(d => { d.count = 0; }),
  })
);

// 2. Use outside React
counter.increment();
console.log(counter.getSnapshot()); // { count: 1 }

// 3. Use inside React (auto re-renders on select)
function Counter() {
  const count = useStore(counter, s => s.count);
  return <button onClick={counter.increment}>{count}</button>;
}
```

## Common API

| Method                        | What it does      | Example                                     |
| ----------------------------- | ----------------- | ------------------------------------------- |
| `createStore(state, methods)` | Make a store      | `createStore({ count: 0 }, api => ({...}))` |
| `useStore(store, selector)`   | Hook into React   | `useStore(counter, s => s.count)`           |
| `store.getSnapshot()`         | Get current state | Outside React, anytime                      |
| `store.update(recipe)`        | Mutate state      | `store.update(d => { d.x = 1; })`           |
| `store.set(next)`             | Replace state     | `store.set({ count: 0 })`                   |
| `store.batch(fn)`             | Batch updates     | Multiple mutations, one notification        |
| `store.reset()`               | Reset to initial  | Restores snapshot, always notifies          |

## Three overloads of `useStore`

```ts
// 1. Full snapshot
const snap = useStore(counter);

// 2. Selector shorthand (re-render only when result changes)
const count = useStore(counter, (s) => s.count);

// 3. With options
const slice = useStore(counter, {
  select: (s) => ({ x: s.x, y: s.y }),
  context: apiClient,
  equals: shallowEqual,
});
```

## Advanced (but optional)

- **Arrays**: [`createArrayMethods`](README.md#createarraymethodsapi-path-defaults-methods) → `.add()`, `.remove()`, `.set()`, etc.
- **Derived state**: [`createDerivedStore`](README.md#createderivedstoresources-derive-options) → computed store that updates when sources change
- **Watch outside React**: [`watch`](README.md#watchstore-selector-callback-options) → `(next, prev)` callback, unsubscribe returned, zero React dep
- **Context injection**: Pass a context object to store methods; no singletons
- **React context boundary**: [`createStoreContext`](README.md#createstorestorecontextfactory-options) → isolated per-`Provider` store instances; optional `onUnmount` hook for explicit teardown
- **Dispatch wrapper**: [`createStoreDispatch`](README.md#createstoredispatchstore-options) → restrict what methods can be called
- **Debug logging**: [`connectDebugLog`](README.md#connectdebuglogstore-options) → console observer, no extension needed
- **Async state shape**: [`AsyncState<T>` / `runAsync`](README.md#async-state) → standard `idle | pending | fulfilled | rejected` union for store snapshots
- **Safe async**: [`safeAwait`](README.md#safeawaitpromise) → Go-style `[err, result]` tuple, no try/catch
- **Deduplicate concurrent calls**: [`createSingleFlight`](README.md#createsinglflightcreatesingleflight--safesingleflight) → N callers share one execution
- **Serialize concurrent calls**: [`createMutex`](README.md#createmutex--safemutex) → N calls run N times, one at a time

## Need more?

👉 See [**README.md**](README.md) for full API docs with all the details.

## Pro tips

✅ Async methods work natively — `await store.load(id)` just works. Use `safeAwait(promise)` for Go-style `[err, result]` tuples instead of try/catch. For concurrent calls: use `createSingleFlight()` to deduplicate (one fetch, one update, N callers share the result); use `createMutex()` to serialize multi-step operations that must not interleave.

✅ Use `shallowEqual` whenever `select` or a `createDerivedStore` derive returns a **new object literal** — `Object.is` (the default) fails on new references even with identical data, causing spurious re-renders.

✅ `shallowEqual` is one level deep — nested objects/arrays are compared by reference; pass a custom `equals` for deeper structures.

✅ Use `batch()` for multiple edits at once.

✅ Context is for injecting API clients — no module-level singletons.

✅ Derived stores are lazy — they only subscribe when needed.

---

**One more thing:** The store contract requires `structuredClone`-compatible POJOs — plain objects, primitives, `Date`, `Map`, `Set`. No functions, DOM nodes, or class instances.
