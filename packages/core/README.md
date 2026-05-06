counter.getSnapshot(); // { count: 1 }
counter.reset(); // built-in — restores { count: 0 }

<div align="center">

# Stardust — Core

**Zero-dependency POJO state management.**

Framework-agnostic store primitives for React, SolidJS, and beyond.

</div>

---

## Why use this package?

- Simple, serializable state (POJO snapshots)
- No runtime dependencies
- Structural sharing and path-based updates
- Async state, batching, and derived stores
- Designed for integration with React and SolidJS adapters

---

## Installation

```bash
npm install @stardust/core
```

## Quick Start

```ts
import { createStore } from '@stardust/core';

const counter = createStore({ count: 0 }, ({ update }) => ({
  actions: {
    increment() {
      update((d) => {
        d.count++;
      });
    },
  },
}));

// Outside any framework
counter.actions.increment();
counter.getSnapshot(); // { count: 1 }
counter.reset(); // restores { count: 0 }
```

## API Reference

> Full API documentation is below. This section will be auto-generated from JSDoc in a future release.

### `createStore(initialSnapshot, builder, options?)`

Creates a store with a POJO snapshot and domain methods.

```ts
createStore<TState, TMethods, TContext = never>(
  initialSnapshot: TState,
  builder: (api: StoreApi<TState, TContext>) => { readonly actions: TMethods },
  options?: StoreSubscriptionOptions<TState, TContext>,
): Store<TState, TMethods>
```

| Option      | Type                                | Default           | Description                                                                                                                                                                  |
| ----------- | ----------------------------------- | ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `equals`    | `(a: TState, b: TState) => boolean` | `Object.is`       | Equality function used by `set()` and `update()`. Skips notification when the new snapshot equals the current one.                                                           |
| `deepClone` | `(value: TState) => TState`         | `structuredClone` | Deep-copy function used by `update()` and `reset()`. Override to support non-POJO snapshots or use a faster alternative (`klona`, `lodash/cloneDeep`, etc).                  |
| `context`   | `UnwrapContext<TContext>`           | `undefined`       | Seeds the store's context at creation time. Equivalent to calling `store.setContext(ctx)` immediately after construction. Can still be overwritten later via `setContext()`. |

The three generics are all optional — TypeScript infers them from the arguments:

- **`TState`** — plain serialisable snapshot. Must survive `structuredClone()` (the default `deepClone`). Supply a custom `deepClone` option if your snapshot contains values that `structuredClone` cannot handle.
- **`TMethods`** — domain methods returned by the builder. Merged onto the store object alongside the snapshot.
- **`TContext`** — collaborators injected via `useStore({ context })` or `options.context` at creation time. Store methods retrieve them via `getContext()` — no module-level imports, no singletons.

```ts
type ApiClient = { fetchUser(id: string): Promise<User> };

// Three-generic form — context injected by the component
const userStore = createStore<UserState, UserMethods, ApiClient>(
  { user: null },
  ({ update, getContext }) => ({
    actions: {
      async load(id: string) {
        const api = getContext(); // ApiClient — always defined
        const user = await api.fetchUser(id);
        update((d) => {
          d.user = user;
        });
      },
    },
  })
);
```

#### Async store methods

Store methods can be `async` — `await dispatch(...)` and direct calls both return the promise. Three utilities from `@stardust/core` complement async methods well:

- **`safeAwait(promise)`** — Go-style `[err, result]` tuple. Replaces `try/catch` blocks inside methods with inline error checks, keeping the happy path readable.
- **`safeSingleFlight` / `createSingleFlight()`** — Deduplicates concurrent calls. While a task is in-flight every subsequent call receives the same promise — one network request, one store update, N callers resolved together. Gate clears on settlement so the next call starts fresh.
- **`safeMutex` / `createMutex()`** — Serializes concurrent calls. N calls run N times, one at a time in submission order. Use when a method has multi-step side-effects (fetch → state write → cross-store dispatch) that must not interleave.

|                  | `createSingleFlight()`      | `createMutex()`              |
| ---------------- | --------------------------- | ---------------------------- |
| Concurrent calls | share one execution         | run sequentially             |
| Network requests | 1                           | N                            |
| Store updates    | 1                           | N                            |
| Best for         | config/reference data fetch | multi-step ordered workflows |

```ts
import {
  asyncFulfilled,
  asyncIdle,
  asyncPending,
  asyncRejected,
  createMutex,
  createSingleFlight,
  createStore,
  runAsync,
  safeAwait,
  type AsyncState,
} from '@stardust/core';

// ── Deduplication — N concurrent callers share one execution ─────────────────
const loadFlight = createSingleFlight();

const configStore = createStore<ConfigState, ConfigMethods, ApiClient>(
  { config: asyncIdle },
  ({ update, getContext }) => ({
    actions: {
      load(): Promise<void> {
        return loadFlight(() =>
          runAsync(
            () => getContext().fetchConfig(),
            (state) => {
              update((d) => {
                d.config = state;
              });
            }
          )
        );
      },
    },
  })
);

// ── Serialization — concurrent calls run one at a time, in order ─────────────
const rxLoadMutex = createMutex();

const rxStore = createStore<RxState, RxMethods, RxContext>(
  { prescription: asyncIdle },
  ({ update, getContext }) => ({
    actions: {
      load(rxId: string): Promise<void> {
        return rxLoadMutex(async () => {
          const { api, logger } = getContext();
          update((d) => {
            d.prescription = asyncPending;
          });
          const [err, rx] = await safeAwait(api.fetchPrescription(rxId));
          if (err !== null) {
            logger.warn('Failed to load prescription', { rxId, error: err.message });
            update((d) => {
              d.prescription = asyncRejected(err);
            });
            return;
          }
          const { services, ...rxData } = rx;
          update((d) => {
            d.prescription = asyncFulfilled(rxData);
            d.services = services;
          });
          await getContext().patientDispatch('load', rx.patientId);
        });
      },
    },
  })
);
```

Use `MaybeContext<T>` when context may arrive asynchronously — `getContext()` returns `T | undefined` instead of `T`, enforcing guards at call sites. Callers of `setContext` and `useStore({ context })` always pass the plain `T`. See the source JSDoc for detailed examples.

#### `StoreApi` methods

| Method                   | Description                                                                                                                                                                                                                                                                                                                                                                     |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `get()`                  | Returns the current snapshot                                                                                                                                                                                                                                                                                                                                                    |
| `set(next)`              | Replaces the snapshot. Accepts an object or `(prev) => next` updater. Skips notification when `===` identical                                                                                                                                                                                                                                                                   |
| `update(recipe)`         | Draft-based mutation via `deepClone` (defaults to `structuredClone`). Safe for arbitrary changes                                                                                                                                                                                                                                                                                |
| `getByPath(path)`        | Typed read at a dot/bracket path (`'user.address.city'`, `'items[0].name'`)                                                                                                                                                                                                                                                                                                     |
| `setByPath(path, value)` | Typed write with structural sharing. Skips when value is `===` identical                                                                                                                                                                                                                                                                                                        |
| `batch(fn)`              | Groups mutations — single notification after `fn` completes. Supports nesting                                                                                                                                                                                                                                                                                                   |
| `reset()`                | Three forms: (1) bare `reset()` — deep-clones the stored baseline and commits it; (2) `reset(newSnapshot)` — commits the value and updates the stored baseline so future bare `reset()` calls restore to this new value; (3) `reset(updater)` — receives a clone of the current baseline and returns the next one. All forms notify listeners — or defer when inside `batch()`. |
| `getContext()`           | Returns the injected context. Return type depends on `TContext`: plain `TContext` → always `TContext`; `MaybeContext<T>` → `T \| undefined` (safe for async injection). Returns `undefined` at runtime before `setContext` is called regardless of declared type.                                                                                                               |

#### `Store` instance (returned)

| Property                 | Description                                                                                   |
| ------------------------ | --------------------------------------------------------------------------------------------- |
| `subscribe(listener)`    | Adds a listener, returns unsubscribe. Compatible with `useSyncExternalStore`                  |
| `getSnapshot()`          | Returns the current snapshot                                                                  |
| `listenerCount`          | Number of active subscribers. `0` means no component or watcher is subscribed                 |
| `set(next)`              | Same as `StoreApi.set`                                                                        |
| `update(recipe)`         | Same as `StoreApi.update`                                                                     |
| `getByPath(path)`        | Same as `StoreApi.getByPath`                                                                  |
| `setByPath(path, value)` | Same as `StoreApi.setByPath`                                                                  |
| `batch(fn)`              | Same as `StoreApi.batch`                                                                      |
| `reset()`                | Same as `StoreApi.reset`                                                                      |
| `run(name, fn)`          | Execute `fn` under a named action scope (for external mutations tracked by `connectDebugLog`) |
| `setContext(ctx)`        | Injects the context value. Accepts the unwrapped `TContext` (not `MaybeContext<T>`)           |
| `actions`                | Object containing all domain methods from the builder (`store.actions.methodName()`)          |

---

### `produce(state, recipe)`

Standalone `structuredClone`-based draft updater.

```ts
const next = produce(state, (draft) => {
  draft.name = 'Alice';
});
// state is unchanged, next is a new object
```

---

### `batch(fn)`

Group multiple mutations into a single listener notification. Available on both `Store` and `StoreApi`.

```ts
store.batch(() => {
  store.setByPath('firstName', 'Alice');
  store.setByPath('lastName', 'Smith');
  store.setByPath('age', 30);
});
// Listeners notified once with the final snapshot
```

Supports nesting — only the outermost batch triggers notification.

---

### `useStore(store, selectorOrOptions?)`

React hook via `useSyncExternalStore`. Three overloads:

```ts
// Full snapshot
const snap = useStore(store);

// Selector shorthand — re-renders only when the selected value changes (Object.is)
const count = useStore(store, (s) => s.count);

// Options form — selector + context + custom equality
const slice = useStore(store, {
  select: (s) => ({ x: s.x, y: s.y }),
  context: apiClient,
  equals: shallowEqual,
});
```

| Option    | Description                                                                                                                        |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `select`  | Selector function. Component re-renders only when the result changes under `equals`.                                               |
| `context` | Injected via `setContext` before subscription. Identity changes do not trigger re-renders.                                         |
| `equals`  | Equality for the selected slice. Defaults to `Object.is`. Use `shallowEqual` when `select` returns a new object literal each time. |

Selectors returning new object references (`s => ({ a: s.a })`) need `equals: shallowEqual` to avoid re-rendering on every update.

---

### `useSuspenseStore(store, select, options?)`

Subscribe to an `AsyncState<T>` slice of a store using React Suspense. Eliminates manual `status` guards — write components as if the data is already available.

```ts
import { useSuspenseStore } from '@stardust/react';
import { Suspense } from 'react';

function UserCard() {
  // Throws a Promise while idle/pending; throws Error if rejected; returns T when fulfilled
  const user = useSuspenseStore(userStore, (s) => s.user);
  return <div>{user.name}</div>;
}

// With context injection:
function PatientCard() {
  const patient = useSuspenseStore(patientStore, (s) => s.patient, { context: apiClient });
  return <div>{patient.name}</div>;
}

// Mount site — wrap in Suspense and an ErrorBoundary
<ErrorBoundary fallback={<p>Error</p>}>
  <Suspense fallback={<p>Loading…</p>}>
    <UserCard />
  </Suspense>
</ErrorBoundary>
```

| `AsyncState` status | Behaviour                                                       |
| ------------------- | --------------------------------------------------------------- |
| `fulfilled`         | Returns `T` — component renders normally                        |
| `rejected`          | Throws the stored `Error` — caught by nearest `<ErrorBoundary>` |
| `idle` / `pending`  | Throws a `Promise` — caught by nearest `<Suspense>`             |

The thrown Promise resolves on the next store emission (via a `useSyncExternalStore` subscription), causing React to retry rendering. A module-level `WeakMap` caches the pending Promise per store — no ref writes during render, no memory leak.

**Context injection:** Pass `{ context }` as the optional third argument. `setContext` is called synchronously before the first subscription — store methods can call `getContext()` on the first render.

---

### `shallowEqual(a, b)`

Shallow equality function for the `equals` option of `useStore` and `createDerivedStore`. Prevents unnecessary re-renders when a selector or derive function returns a **new object reference** on every call.

**Algorithm:**

1. `Object.is(a, b)` — fast path for identical references and primitives.
2. Either non-object or `null` → `false`.
3. Own enumerable key count must match.
4. `Object.is` comparison for every key value.

**When to use it**

The default equality for both `useStore` and `createDerivedStore` is `Object.is`. This is correct for primitive selectors:

```ts
const count = useStore(store, (s) => s.count); // number — Object.is is fine
```

But a selector or derive that returns a **new object literal every call** always fails `Object.is`, even when the data is unchanged — causing a re-render or notification on every upstream update:

```ts
// ❌ Re-renders on every store update — new object reference each time
const pos = useStore(store, (s) => ({ x: s.x, y: s.y }));

// ✅ Re-renders only when x or y actually changes
const pos = useStore(store, {
  select: (s) => ({ x: s.x, y: s.y }),
  equals: shallowEqual,
});
```

Same applies to derived stores:

```ts
// ❌ Notifies on every source update regardless of value change
const summary = createDerivedStore([userStore], (u) => ({ name: u.name, age: u.age }));

// ✅ Notifies only when name or age actually changes
const summary = createDerivedStore([userStore], (u) => ({ name: u.name, age: u.age }), {
  equals: shallowEqual,
});
```

> **Limitation** — one level deep only. Values that are themselves objects or arrays are compared by reference (`Object.is`), not by value. Pass a custom `equals` function for nested structures.

---

### `watch(store, selector?, callback, options?)`

Non-React equivalent of `useStore` with a selector. Fires `callback(newValue, oldValue)` only when the observed value changes. Returns an unsubscribe function. Zero React imports — safe for Node, Vue, Svelte, or plain JS.

```ts
import { watch, shallowEqual } from '@stardust/core';

// Watch full snapshot
const unsub = watch(store, (next, prev) => {
  console.log('store changed', next, prev);
});

// Watch a slice — only fires when `count` changes
const unsub = watch(
  store,
  (s) => s.count,
  (next, prev) => {
    console.log('count', prev, '→', next);
  }
);

unsub(); // stop watching
```

Does **not** fire immediately on subscription — only on the first mutation that produces a changed value.

---

### `createDerivedStore(sources, derive, options?)`

Read-only store that recomputes whenever any source store notifies.

```ts
createDerivedStore<TSources, TResult>(
  sources: TSources,                        // tuple of stores
  derive: (...snapshots: Snapshots) => TResult,
  options?: { equals?: (a: TResult, b: TResult) => boolean },
): DerivedStore<TResult>
```

The derive callback receives plain **snapshots** from each source — not store objects. Subscribers are only notified when the result changes according to `equals` (default: `Object.is`). Use `shallowEqual` for derives returning new object literals.

**Lazy subscriptions** — subscribes to sources only while it has listeners. Zero overhead when unused.

---

### `createArrayMethods(defaults)`

Two-stage factory for typed, immutable array helpers. Define the item shape once, then bind to any store and path via `.mount(api, path)`.

Provide `TItem` explicitly to prevent TypeScript from narrowing literal defaults (e.g. `asyncIdle` → `AsyncIdle`), so no `as` casts are needed.

```ts
// Stage 1 — define once, reusable across stores
const phoneOps = createArrayMethods<Phone>({ number: '', label: 'mobile' });

// Stage 2 — bind inside the domain builder (optimized writes: structural sharing, no structuredClone)
const store = createStore({ phones: [] as Phone[] }, (api) => ({
  actions: {
    phones: phoneOps.mount(api, 'phones'),
  },
}));

store.actions.phones.add({ number: '514...' }); // append with overrides
store.actions.phones.set(0, { label: 'work' }); // partial merge
store.actions.phones.update((item) => item.number === '514...', { label: 'work' }); // patch the first matching item
store.actions.phones.setByPath(0, 'number', '…'); // typed path setter
store.actions.phones.remove(1); // delete by index
store.actions.phones.move(0, 2); // reorder

// upsert: replace matching item or append — predicate `this` is the needle
store.actions.phones.upsert(incoming, function (item) {
  return item.number === this.number;
});
// batch upsert: one store write for all needles
store.actions.phones.upsert([a, b, c], function (item) {
  return item.number === this.number;
});
```

> **Arrow functions won't work with `upsert`.** Arrow functions capture `this` lexically and ignore `thisArg` binding — `this` will not be the needle. Always use a `function` expression.

---

### `createCachedSlice(api, options?)`

Cache a slice of the store — root or nested — with observable cache status. The managed store field holds a `CachedState<T>` discriminated union, making every status transition (idle → pending → fresh → expired → rejected) reactive via `watch` and `createDerivedStore`.

**`CachedState<T>` union variants**

| Variant             | Fields                                                     | Description                                                      |
| ------------------- | ---------------------------------------------------------- | ---------------------------------------------------------------- |
| `CachedIdle`        | `status: 'idle'`                                           | No data loaded yet.                                              |
| `CachedPending<T>`  | `status: 'pending'; data: T \| undefined`                  | Fetch in-flight. `data` holds the previous value or placeholder. |
| `CachedFresh<T>`    | `status: 'fresh'; data: T; expiresAt: number \| undefined` | Data is current.                                                 |
| `CachedExpired<T>`  | `status: 'expired'; data: T; expiresAt: number`            | TTL elapsed — data available but stale.                          |
| `CachedRejected<T>` | `status: 'rejected'; error: Error; data: T \| undefined`   | Fetch failed.                                                    |

**Methods**

| Method                             | Description                                                                                                                                                                                         |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `get()`                            | Returns the current `CachedState<TValue>`.                                                                                                                                                          |
| `set(data, expiresAt?)`            | Writes `cachedFresh(data, expiresAt)`. Skips the store write when equal (via `equals`) and no `expiresAt` is given; always rewrites when `expiresAt` is set to reset the TTL.                       |
| `expire()`                         | Manually transitions `fresh → expired`. No-op if not in `'fresh'` state.                                                                                                                            |
| `refresh(fetcher, options?)`       | Calls `fetcher(current)`, transitions `pending → fresh`. Single-flight: concurrent callers share one execution.                                                                                     |
| `refreshIfExpired(fetcher, opts?)` | Same as `refresh()` but only runs when status is `'expired'`. Returns `undefined` otherwise.                                                                                                        |
| `startAutoRefresh({ interval })`   | Arms the auto-refresh cycle. `interval` (ms) is stamped as `expiresAt` on each refreshed value and used as the retry delay after rejection. If already `'expired'`, triggers the fetch immediately. |
| `stopAutoRefresh()`                | Disables auto-fetch on expire. The `'fresh' → 'expired'` timer keeps firing — expiry stays observable. Call `expire()` explicitly to also cancel the pending timer.                                 |

**Constructor options — `CachedOptions`**

`keepPreviousData` and `placeholder` are **mutually exclusive** — TypeScript enforces this at the call site.

| Option             | Type                                                               | Default     | Description                                                                                                                                                                          |
| ------------------ | ------------------------------------------------------------------ | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `keepPreviousData` | `true`                                                             | —           | Keep the current value visible while the refresh is in-flight (`CachedPending.data = previous`). Forbids `placeholder`.                                                              |
| `placeholder`      | `TValue`                                                           | —           | Written as `CachedPending.data` before the fetch begins when `keepPreviousData` is absent/`false`. Acts as the helper-level default for both `refresh()` and auto-refresh.           |
| `equals`           | `(a: TValue, b: TValue) => boolean`                                | `Object.is` | Skip the store write when the new value is equal to the current. For object snapshots, prefer `shallowEqual` — every fetch returns a new reference so `Object.is` is always `false`. |
| `refreshOnExpire`  | `(current: TValue \| undefined, api: StoreApi) => Promise<TValue>` | —           | Called automatically each expiration cycle by `startAutoRefresh({ interval })`. Must return the new value — the helper writes `cachedFresh` and reschedules the timer.               |

**Per-call options — `CachedRefreshOptions`** (passed to `refresh()` / `refreshIfExpired()`)

`keepPreviousData` and `placeholder` are **mutually exclusive** here too — TS error if both are present.

| Option             | Type     | Description                                                                                        |
| ------------------ | -------- | -------------------------------------------------------------------------------------------------- |
| `keepPreviousData` | `true`   | Overrides the constructor-level `keepPreviousData` for this call only. Forbids `placeholder`.      |
| `placeholder`      | `TValue` | Overrides the constructor-level `placeholder` for this call only; written as `CachedPending.data`. |
| `expiresAt`        | `number` | Absolute timestamp (ms) stamped on the `CachedFresh` result. Omit for indefinite freshness.        |

```ts
import {
  cachedFresh,
  cachedIdle,
  createCachedSlice,
  createStore,
  type CachedState,
} from '@stardust/core';

const TTL = 60_000;

// Root slice — the whole store IS a CachedState<Item[]>
const itemStore = createStore(cachedFresh<Item[]>([]), (api) => ({
  actions: {
    cache: createCachedSlice(api, {
      placeholder: [],
      refreshOnExpire: async (current, storeApi) => storeApi.getContext().fetchItems(),
    }),
  },
}));

// Arm auto-refresh with a 60 s interval (stamps expiresAt on each result)
itemStore.actions.cache.startAutoRefresh({ interval: TTL });

// Sub-slice — profile is a nested CachedState<Profile>
const appStore = createStore({ profile: cachedFresh({ name: 'Alice' }), version: 1 }, (api) => ({
  actions: {
    profileCache: createCachedSlice(api, 'profile', {
      keepPreviousData: true,
      refreshOnExpire: async (current, storeApi) => storeApi.getContext().fetchProfile(),
    }),
  },
}));

// React: observe cache status in a selector
const profileState = useStore(appStore, (s) => s.profile);
if (profileState.status === 'fresh') {
  console.log(profileState.data.name);
} else if (profileState.status === 'expired') {
  console.log('Stale:', profileState.data.name);
}

// Arm auto-refresh; stop on cleanup
appStore.actions.profileCache.startAutoRefresh({ interval: TTL });
// on unmount:
appStore.actions.profileCache.stopAutoRefresh();

// Manual refresh with explicit TTL
await appStore.actions.profileCache.refresh(async (current) => fetchProfile(current?.id ?? ''), {
  expiresAt: Date.now() + TTL,
});

// Manual expire-then-refresh
appStore.actions.profileCache.expire(); // writes CachedExpired to snapshot immediately
await appStore.actions.profileCache.refreshIfExpired(async (current) =>
  fetchProfile(current?.id ?? '')
);
```

---

### `createStoreDispatch(store, options?)`

Wraps a store into a single `dispatch(action, ...args)` function. Useful for passing a controlled mutation interface as context to another store, or for decoupling callers from the store shape.

```ts
import { createStore, createStoreDispatch } from '@stardust/core';

const counter = createStore({ count: 0 }, ({ update }) => ({
  actions: {
    increment() {
      update((d) => {
        d.count += 1;
      });
    },
  },
}));

// Domain-only dispatch — built-ins not reachable
const dispatch = createStoreDispatch(counter);
dispatch('increment'); // ✅ domain method
dispatch('set', { count: 0 }); // ❌ type error — not a domain action

// Restrict dispatchable actions
const limited = createStoreDispatch(counter, { domain: ['increment'] });
limited('increment'); // ✅
```

By default, all domain actions from `store.actions` are dispatchable. Use the `domain` option to restrict which actions are allowed. Built-in operations (`set`, `update`, `reset`, etc.) are never dispatchable — call them directly on the store instead.

---

### `createStoreContext(factory, options?)`

Binds a Stardust store to a React context. Each `Provider` mount creates its own isolated store instance; the store is garbage-collected on unmount. An optional `onUnmount` hook handles explicit teardown (e.g. cancel timers, close sockets). Imported from `@stardust/react`.

```ts
import { createStoreContext } from '@stardust/react';

const CounterCtx = createStoreContext(
  () =>
    createStore({ count: 0 }, ({ update }) => ({
      actions: {
        increment() {
          update((d) => { d.count += 1; });
        },
      },
    })),
  { name: 'Counter' },
);

<CounterCtx.Provider>
  <Counter />
</CounterCtx.Provider>

function Counter() {
  const store = CounterCtx.useStoreContext();
  const count = CounterCtx.useSnapshot((s) => s.count);
  return <button onClick={store.actions.increment}>{count}</button>;
}
```

---

### `connectDebugLog(store, options?)`

Connects a store to the `stardust:store` debug logger. No browser extension required. Every mutation (built-in and domain) is logged with its action name, a monotonic action ID plus sub-ID (`#0001-00`), and the resulting diff plus current snapshot.

```ts
connectDebugLog<TSnapshot>(
  store: Store<TSnapshot, any>,
  options?: ConnectDebugLogOptions,
): () => void
```

| Option  | Type       | Default             | Description                                                                                                                                                                                                                                                                    |
| ------- | ---------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `name`  | `string`   | _(bare `store`)_    | Forms the logger namespace `store:name`. Omit for bare `store` namespace.                                                                                                                                                                                                      |
| `onLog` | `function` | _(built-in logger)_ | Custom log handler `(action, diff, durationMs, actionId, listenerCount) => void`. Bypasses the built-in logger entirely; the built-in logger prints `listeners:N` after subtracting its own internal subscription and includes the current snapshot object alongside the diff. |

`connectDebugLog` has no built-in environment guard. Wrap the call yourself to control when it's active:

```ts
if (import.meta.env.DEV) {
  connectDebugLog(store, { name: 'counter' });
}
```

**Activation** — controlled by `localStorage`:

```ts
localStorage.setItem('stardust:log', 'store'); // all stores
localStorage.setItem('stardust:log', 'store:counter'); // one store
```

Returns a `disconnect` function that removes all subscriptions and restores original methods.

---

### Async State

A standard async state shape for store snapshots.

```ts
import {
  asyncFulfilled,
  asyncIdle,
  asyncPending,
  asyncRejected,
  runAsync,
  type AsyncState,
} from '@stardust/core';
```

**Types**

```ts
type AsyncIdle = { readonly status: 'idle' };
type AsyncPending = { readonly status: 'pending' };
type AsyncFulfilled<T> = { readonly status: 'fulfilled'; readonly data: T };
type AsyncRejected = { readonly status: 'rejected'; readonly error: Error };

type AsyncState<T> = AsyncIdle | AsyncPending | AsyncFulfilled<T> | AsyncRejected;
```

**Constructors**

| Export                 | Returns             | Notes                                              |
| ---------------------- | ------------------- | -------------------------------------------------- |
| `asyncIdle`            | `AsyncIdle`         | Shared singleton — stable reference                |
| `asyncPending`         | `AsyncPending`      | Shared singleton — stable reference                |
| `asyncFulfilled(data)` | `AsyncFulfilled<T>` | New object each call                               |
| `asyncRejected(error)` | `AsyncRejected`     | Accepts `unknown`; normalizes via `normalizeError` |

**`runAsync(task, onState)`** → `Promise<AsyncFulfilled<T> | AsyncRejected>`

Calls `onState(asyncPending)` first, then `onState(asyncFulfilled(result))` on success or `onState(asyncRejected(err))` on failure.

---

### `safeAwait(promise)`

Go-style `[error, result]` tuple — replaces `try/catch` with an inline check on the error position.

```ts
import { safeAwait } from '@stardust/core';

const [err, data] = await safeAwait(fetch('/api/user').then((r) => r.json()));
if (err) return; // handle error
console.log(data); // typed T, not T | null
```

Non-`Error` rejections (strings, numbers, `null`) are normalised to `Error` automatically.

**Type**

```ts
type SafeAwaitResult<T> = readonly [error: null, result: T] | readonly [error: Error, result: null];

function safeAwait<T>(promise: Promise<T>): Promise<SafeAwaitResult<T>>;
```

---

### `createSingleFlight()` / `safeSingleFlight`

Deduplicates concurrent async calls — while a task is in-flight every subsequent call for the same flight shares the same `Promise`. One execution, N callers resolved together. The gate clears on settlement so the next call starts a fresh execution.

```ts
import { createSingleFlight, safeSingleFlight } from '@stardust/core';

// scoped — independent gate per resource
const loadUser = createSingleFlight();
const user = await loadUser(() => api.fetchUser(id)); // called once even with 10 concurrent calls

// module-level singleton — shared gate across all callers
const result = await safeSingleFlight(() => expensiveInit());
```

**When to prefer over `createMutex`**: use single-flight when concurrent callers can share one result (e.g. fetching a resource). Use `createMutex` when each caller must trigger its own side-effect.

**Type**

```ts
type SingleFlight = <T>(task: () => Promise<T>) => Promise<T>;

function createSingleFlight(): SingleFlight;
const safeSingleFlight: SingleFlight;
```

---

### `createMutex()` / `safeMutex`

Serialises concurrent async calls — N calls run N times, one at a time in submission order. Use when a method has multi-step side-effects (fetch → state write → cross-store dispatch) that must not interleave.

```ts
import { createMutex, safeMutex } from '@stardust/core';

// scoped mutex per resource — independent from the singleton
const saveMutex = createMutex();
await saveMutex(() => api.save(payload)); // second call waits for first to settle

// module-level singleton
await safeMutex(() => dispatch('asyncLoadDefaults'));
```

Errors in one task do not stall the queue — subsequent tasks always proceed.

**Type**

```ts
type Mutex = <T>(task: (() => T | Promise<T>) | Promise<T> | T) => Promise<T>;

function createMutex(): Mutex;
const safeMutex: Mutex;
```

---

## Path Access

`getByPath` and `setByPath` accept dot/bracket path strings with full type inference:

```ts
store.getByPath('user.address.city'); // inferred: string
store.setByPath('items[0].name', 'foo'); // type-checked value
```

`PathsOf<T>` enumerates all valid paths (depth ≤ 5). `ValueAtPath<T, P>` infers the value type at a given path. Both are exported for userland use.

---

## Prior Art

Ten interaction patterns — each borrowing the best idea from a different library or ecosystem.

| Pattern              | API                                                                           | Inspired by      | Cost                                 | When to reach for it                                                            |
| -------------------- | ----------------------------------------------------------------------------- | ---------------- | ------------------------------------ | ------------------------------------------------------------------------------- |
| Whole-state swap     | `set(next)`                                                                   | Zustand          | O(1) — no copy                       | Atomic replacements, computed resets, simple atoms                              |
| Path-based write     | `setByPath(path, value)`                                                      | react-hook-form  | O(depth) — structural sharing        | Surgical single-field updates in nested state                                   |
| Draft mutation       | `update(recipe)`                                                              | Immer            | O(n) — full `structuredClone`        | Complex multi-field changes where mutation syntax is clearer                    |
| Array CRUD           | `createArrayMethods(defaults).mount(api, path)`                               | RHF field arrays | O(array length) — structural sharing | Dynamic lists: add, remove, reorder, partial merge, path-set                    |
| Computed / derived   | `createDerivedStore(sources, derive)`                                         | Redux selectors  | Lazy — zero cost when unused         | Cross-store projections, memoised computed values                               |
| Cache helpers        | `createCachedSlice(api, options?)` / `createCachedSlice(api, path, options?)` | Cache helpers    | Keep previous data during refresh    | Async refresh helpers for root and nested slices                                |
| Grouped writes       | `batch(fn)`                                                                   | Redux batch      | Single notification                  | Multi-field atomicity, avoid intermediate render flickers                       |
| Standalone transform | `produce(state, recipe)`                                                      | Immer standalone | O(n) — full `structuredClone`        | One-off transformations outside a store, pure utilities                         |
| Dispatch             | `createStoreDispatch(store)`                                                  | Redux dispatch   | Near-zero — single property lookup   | Controlled store-to-store context, decoupled callers                            |
| React context        | `createStoreContext(factory, options?)`                                       | React Context    | Per-mount `useState` initializer     | Isolated per-subtree store instances with typed `initial` + `context` props     |
| Suspense integration | `useSuspenseStore(store, select, options?)`                                   | React Suspense   | Near-zero — WeakMap cache            | `AsyncState<T>` slices in Suspense trees; eliminates `status` guard boilerplate |
| Debug logging        | `connectDebugLog(store, options?)`                                            | Custom logger    | Near-zero — wrap in `if (DEV)`       | Console mutation observer, action names, flat path diff, timing                 |

---

## Performance

- **Identity skip** — `set()` and `setByPath()` are no-ops when the value is equal according to the store's `equals` function (default `Object.is`). No copy, no notification.
- **Structural sharing** — `setByPath()` shallow-copies only objects along the mutation path. Unchanged branches keep reference identity. 8–41× faster than `structuredClone`.
- **Memoized path parsing** — `parsePath()` caches results in a `Map`. 5–21× faster on repeated paths.
- **Batching** — `batch()` coalesces multiple mutations into a single listener notification.
- **Selector equality** — `useStore` with a selector re-renders only when `Object.is(prev, next)` is `false`.
- **Derived store laziness** — `createDerivedStore` subscribes to sources only while it has active listeners.

Run `npm run bench` to execute all benchmarks.

---

## POJO Contract

Snapshots must be `structuredClone`-compatible:

| Supported                                  | Not supported                       |
| ------------------------------------------ | ----------------------------------- |
| Plain objects, arrays                      | Functions                           |
| Primitives (string, number, boolean, null) | DOM nodes                           |
| `Date`, `Map`, `Set`, `ArrayBuffer`        | Class instances with internal slots |
| Nested combinations of the above           | Symbols                             |

---

## Module Structure

| File                           | Exports                                                                                                                                                  | Purpose                                                |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| `create-store.ts`              | `createStore`, `createStoreSubscription`, `StoreApi`, `Store`, `StoreSubscriptionOptions`                                                                | Core store factory                                     |
| `produce.ts`                   | `produce`                                                                                                                                                | `structuredClone`-based draft updater                  |
| `shallow-equal.ts`             | `shallowEqual`                                                                                                                                           | Shallow equality for `equals` option                   |
| `watch.ts`                     | `watch`, `WatchOptions`                                                                                                                                  | Non-React store observer                               |
| `create-derived-store.ts`      | `createDerivedStore`, `DerivedStore`, `DerivedStoreOptions`                                                                                              | Read-only computed store                               |
| `create-array-methods.ts`      | `createArrayMethods`, `ArrayMethods`, `ArrayMethodsFactory`                                                                                              | Two-stage typed array helper factory                   |
| `create-store-dispatch.ts`     | `createStoreDispatch`, `StoreDispatch`, `DispatchOptions`                                                                                                | Dispatch wrapper for controlled store access           |
| `async-state.ts`               | `AsyncState`, `AsyncIdle`, `AsyncPending`, `AsyncFulfilled`, `AsyncRejected`, `asyncIdle`, `asyncPending`, `asyncFulfilled`, `asyncRejected`, `runAsync` | Standard async state shape                             |
| `connect-debug-log.ts`         | `connectDebugLog`, `ConnectDebugLogOptions`                                                                                                              | Console logger via `stardust:store` namespace          |
| `path-utils.ts`                | `PathsOf`, `ValueAtPath`, `parsePath`, `copyOnWritePath`                                                                                                 | Path types and structural sharing                      |
| `safe-await.ts`                | `safeAwait`, `SafeAwaitResult`                                                                                                                           | Go-style `[error, result]` tuple for `Promise`         |
| `single-flight.ts`             | `createSingleFlight`, `safeSingleFlight`, `SingleFlight`                                                                                                 | Deduplicates concurrent async calls                    |
| `mutex.ts`                     | `createMutex`, `safeMutex`, `Mutex`                                                                                                                      | Serialises concurrent async calls                      |
| `react.ts` (`@stardust/react`) | `useStore`, `UseStoreOptions`, `useSuspenseStore`, `createStoreContext`, `CreateStoreContextOptions`, `StoreContextResult`                               | React-specific entry point (keeps core zero-React-dep) |
