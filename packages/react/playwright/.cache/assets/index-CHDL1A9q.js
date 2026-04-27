import { g as getDefaultExportFromCjs, r as reactExports } from './index-C2HjpCzT.js';

var jsxRuntime$2 = { exports: {} };

var reactJsxRuntime_production = {};

/**
 * @license React
 * react-jsx-runtime.production.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

var hasRequiredReactJsxRuntime_production;

function requireReactJsxRuntime_production() {
  if (hasRequiredReactJsxRuntime_production) return reactJsxRuntime_production;
  hasRequiredReactJsxRuntime_production = 1;
  ('use strict');
  var REACT_ELEMENT_TYPE = Symbol.for('react.transitional.element'),
    REACT_FRAGMENT_TYPE = Symbol.for('react.fragment');
  function jsxProd(type, config, maybeKey) {
    var key = null;
    void 0 !== maybeKey && (key = '' + maybeKey);
    void 0 !== config.key && (key = '' + config.key);
    if ('key' in config) {
      maybeKey = {};
      for (var propName in config) 'key' !== propName && (maybeKey[propName] = config[propName]);
    } else maybeKey = config;
    config = maybeKey.ref;
    return {
      $$typeof: REACT_ELEMENT_TYPE,
      type: type,
      key: key,
      ref: void 0 !== config ? config : null,
      props: maybeKey,
    };
  }
  reactJsxRuntime_production.Fragment = REACT_FRAGMENT_TYPE;
  reactJsxRuntime_production.jsx = jsxProd;
  reactJsxRuntime_production.jsxs = jsxProd;
  return reactJsxRuntime_production;
}

var jsxRuntime$1 = jsxRuntime$2.exports;

var hasRequiredJsxRuntime;

function requireJsxRuntime() {
  if (hasRequiredJsxRuntime) return jsxRuntime$2.exports;
  hasRequiredJsxRuntime = 1;
  ('use strict');
  if (true) {
    jsxRuntime$2.exports = requireReactJsxRuntime_production();
  } else {
    module.exports = require('./cjs/react-jsx-runtime.development.js');
  }
  return jsxRuntime$2.exports;
}

var jsxRuntimeExports = requireJsxRuntime();
const jsxRuntime = /*@__PURE__*/ getDefaultExportFromCjs(jsxRuntimeExports);

function normalizeError(err) {
  return err instanceof Error ? err : new Error(String(err));
}

const asyncIdle = { status: 'idle' };
const asyncPending = { status: 'pending' };
function asyncFulfilled(data) {
  return { status: 'fulfilled', data };
}
function asyncRejected(error) {
  return { status: 'rejected', error: normalizeError(error) };
}
async function runAsync(task, onState) {
  onState(asyncPending);
  try {
    const state = asyncFulfilled(await task());
    onState(state);
    return state;
  } catch (err) {
    const state = asyncRejected(err);
    onState(state);
    return state;
  }
}

const storageKey = 'stardust:log';
const colors = {
  store: '#FFC107',
};
const labelStyle = (color) => `color:${color};font-weight:bold;padding:1px 4px;border-radius:2px`;
const resetStyle = 'color:inherit';
let sessionOverride;
function getPattern() {
  if (sessionOverride !== void 0) {
    return sessionOverride;
  }
  try {
    return globalThis.localStorage.getItem(storageKey) ?? null;
  } catch {
    return null;
  }
}
const namespacePrefix = 'stardust:';
function normalize(token) {
  const t = token.trim();
  return t.startsWith(namespacePrefix) ? t.slice(namespacePrefix.length) : t;
}
function matches(namespace) {
  const pattern = getPattern();
  if (!pattern) {
    return false;
  }
  if (pattern === '*') {
    return true;
  }
  return pattern.split(',').some((p) => {
    const n = normalize(p);
    return namespace === n || namespace.startsWith(n + ':');
  });
}
function resolveColor(namespace) {
  if (colors[namespace]) {
    return colors[namespace];
  }
  const idx = namespace.lastIndexOf(':');
  return idx !== -1 ? resolveColor(namespace.slice(0, idx)) : '#999';
}
function createLogger(namespace) {
  const color = resolveColor(namespace);
  const prefix = `stardust:${namespace}`;
  function emit(method, message, data) {
    if (!matches(namespace)) {
      return;
    }
    const resolved = typeof data === 'function' ? data() : data;
    if (resolved !== void 0) {
      console[method](`%c${prefix}%c ${message}`, labelStyle(color), resetStyle, resolved);
    } else {
      console[method](`%c${prefix}%c ${message}`, labelStyle(color), resetStyle);
    }
  }
  function log(message, data) {
    emit('debug', message, data);
  }
  log.warn = (message, data) => {
    emit('warn', message, data);
  };
  log.error = (message, data) => {
    emit('error', message, data);
  };
  log.group = (message, data) => {
    if (!matches(namespace)) {
      return;
    }
    const resolved = typeof data === 'function' ? data() : data;
    console.groupCollapsed(`%c${prefix}%c ${message}`, labelStyle(color), resetStyle);
    if (resolved !== void 0) {
      console.debug(resolved);
    }
    console.groupEnd();
  };
  return log;
}
function setLogLevel(pattern, persist = false) {
  if (pattern === false) {
    sessionOverride = null;
    if (persist) {
      try {
        globalThis.localStorage.removeItem(storageKey);
      } catch {}
    }
  } else {
    sessionOverride = pattern;
    if (persist) {
      try {
        globalThis.localStorage.setItem(storageKey, pattern);
      } catch {}
    }
  }
}

const BUILTIN_KEYS$1 = /* @__PURE__ */ new Set([
  'subscribe',
  'getSnapshot',
  'set',
  'update',
  'getByPath',
  'setByPath',
  'batch',
  'reset',
  'setContext',
]);
function computeDiff(prev, next, path = '') {
  const result = {};
  if (Object.is(prev, next)) {
    return result;
  }
  if (prev !== null && next !== null && typeof prev === 'object' && typeof next === 'object') {
    if (Array.isArray(prev) && Array.isArray(next)) {
      const len = Math.max(prev.length, next.length);
      for (let i = 0; i < len; i++) {
        Object.assign(result, computeDiff(prev[i], next[i], `${path}[${String(i)}]`));
      }
      return result;
    }
    if (!Array.isArray(prev) && !Array.isArray(next)) {
      const keys = /* @__PURE__ */ new Set([...Object.keys(prev), ...Object.keys(next)]);
      for (const key of keys) {
        const nested = computeDiff(prev[key], next[key], path ? `${path}.${key}` : key);
        Object.assign(result, nested);
      }
      return result;
    }
  }
  result[path || '(root)'] = { from: prev, to: next };
  return result;
}
function connectDebugLog(store, options) {
  const onLog = options?.onLog;
  const logger = onLog ? null : createLogger(options?.name ? `store:${options.name}` : 'store');
  const initSnapshot = store.getSnapshot();
  if (onLog) {
    onLog('init', computeDiff(void 0, initSnapshot), 0, 0);
  } else {
    if (logger) {
      logger.group('init #0000', () => computeDiff(void 0, initSnapshot));
    }
  }
  let currentAction;
  let currentActionId;
  let prevSnapshot;
  let batchActions = [];
  let inBatch = false;
  let startTime;
  let trackingDepth = 0;
  let actionCounter = 0;
  function trackAction(actionName) {
    if (inBatch) {
      batchActions.push(actionName);
    } else {
      currentAction = actionName;
      currentActionId = ++actionCounter;
      prevSnapshot = store.getSnapshot();
      startTime = performance.now();
    }
  }
  function clearTracking() {
    currentAction = void 0;
    currentActionId = void 0;
    prevSnapshot = void 0;
    startTime = void 0;
  }
  const originalSet = store.set;
  const originalUpdate = store.update;
  const originalSetByPath = store.setByPath;
  const originalBatch = store.batch;
  const originalReset = store.reset;
  const mutableStore = store;
  mutableStore['set'] = function wrappedSet(next) {
    if (trackingDepth === 0) {
      trackAction('set');
    }
    originalSet.call(store, next);
  };
  mutableStore['update'] = function wrappedUpdate(recipe) {
    if (trackingDepth === 0) {
      trackAction('update');
    }
    originalUpdate.call(store, recipe);
  };
  mutableStore['setByPath'] = function wrappedSetByPath(path, value) {
    if (trackingDepth === 0) {
      trackAction(`setByPath(${path})`);
    }
    originalSetByPath.call(store, path, value);
  };
  mutableStore['reset'] = function wrappedReset(next) {
    if (trackingDepth === 0) {
      trackAction('reset');
    }
    originalReset.call(store, next);
  };
  mutableStore['batch'] = function wrappedBatch(fn) {
    if (trackingDepth > 0) {
      originalBatch.call(store, fn);
      return;
    }
    inBatch = true;
    batchActions = [];
    prevSnapshot = store.getSnapshot();
    startTime = performance.now();
    originalBatch.call(store, () => {
      fn();
      inBatch = false;
      currentAction = `batch(${batchActions.join(', ')})`;
      batchActions = [];
    });
  };
  const originals = [];
  function wrapMethods(obj, prefix) {
    for (const key of Object.keys(obj)) {
      if (prefix === '' && BUILTIN_KEYS$1.has(key)) {
        continue;
      }
      const value = obj[key];
      if (typeof value === 'function') {
        const actionName = prefix ? `${prefix}.${key}` : key;
        originals.push({ fn: value, owner: obj, key });
        const original = value;
        obj[key] = function wrappedDomain(...args) {
          if (trackingDepth === 0) {
            trackAction(actionName);
          }
          trackingDepth++;
          let result;
          try {
            result = original(...args);
          } catch (e) {
            trackingDepth--;
            if (trackingDepth === 0) {
              clearTracking();
            }
            throw e;
          }
          if (result instanceof Promise) {
            return result.finally(() => {
              trackingDepth--;
              if (trackingDepth === 0) {
                clearTracking();
              }
            });
          }
          trackingDepth--;
          if (trackingDepth === 0) {
            clearTracking();
          }
          return result;
        };
      } else if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        wrapMethods(value, prefix ? `${prefix}.${key}` : key);
      }
    }
  }
  wrapMethods(mutableStore, '');
  const unsubscribeStore = store.subscribe(() => {
    if (currentAction === void 0) {
      logger?.warn(
        '⚠️ Untracked store mutation detected — a stale reference to a pre-wrap method was called directly. Please use the store methods exposed by connectDebugLog instead.'
      );
      return;
    }
    const action = currentAction;
    const actionId = currentActionId;
    const prev = prevSnapshot;
    const next = store.getSnapshot();
    const durationMs = startTime !== void 0 ? performance.now() - startTime : 0;
    if (trackingDepth === 0) {
      clearTracking();
    } else {
      prevSnapshot = next;
      startTime = performance.now();
    }
    if (onLog) {
      onLog(action, computeDiff(prev, next), durationMs, actionId ?? 0);
    } else {
      if (logger) {
        const idTag = actionId !== void 0 ? ` #${String(actionId).padStart(4, '0')}` : '';
        logger.group(`${action}${idTag} (${durationMs.toFixed(2)}ms)`, () =>
          computeDiff(prev, next)
        );
      }
    }
  });
  return function disconnect() {
    unsubscribeStore();
    mutableStore['set'] = originalSet;
    mutableStore['update'] = originalUpdate;
    mutableStore['setByPath'] = originalSetByPath;
    mutableStore['batch'] = originalBatch;
    mutableStore['reset'] = originalReset;
    for (const entry of originals) {
      entry.owner[entry.key] = entry.fn;
    }
    originals.length = 0;
  };
}

function isNullish(value) {
  return value === null || value === void 0;
}

const pathCache = /* @__PURE__ */ new Map();
function parsePath(path) {
  const cached = pathCache.get(path);
  if (cached) {
    return cached;
  }
  const segments = [];
  for (const match of path.matchAll(/([^.[]+)|\[(\d+)\]/g)) {
    if (match[1] !== void 0) {
      segments.push(match[1]);
    } else if (match[2] !== void 0) {
      segments.push(Number(match[2]));
    }
  }
  const frozen = Object.freeze(segments);
  pathCache.set(path, frozen);
  return frozen;
}
function getAtPath(obj, segments) {
  let curr = obj;
  for (const seg of segments) {
    if (isNullish(curr) || typeof curr !== 'object') {
      return void 0;
    }
    curr = curr[seg];
  }
  return curr;
}
function setAtPath(obj, segments, value) {
  let curr = obj;
  for (let i = 0; i < segments.length - 1; i++) {
    if (isNullish(curr) || typeof curr !== 'object') {
      return;
    }
    const seg = segments[i];
    if (seg === void 0) {
      return;
    }
    curr = curr[seg];
  }
  const last = segments[segments.length - 1];
  if (segments.length > 0 && last !== void 0 && !isNullish(curr) && typeof curr === 'object') {
    curr[last] = value;
  }
}
function copyOnWritePath(root, segments, value) {
  if (segments.length === 0) {
    return value;
  }
  const rootCopy = Array.isArray(root) ? [...root] : { ...root };
  let parent = rootCopy;
  for (let i = 0; i < segments.length - 1; i++) {
    const seg = segments[i];
    if (seg === void 0) {
      return root;
    }
    const child = parent[seg];
    if (isNullish(child) || typeof child !== 'object') {
      return root;
    }
    const childCopy = Array.isArray(child) ? [...child] : { ...child };
    parent[seg] = childCopy;
    parent = childCopy;
  }
  const lastSeg = segments[segments.length - 1];
  if (lastSeg !== void 0) {
    parent[lastSeg] = value;
  }
  return rootCopy;
}

function createStoreSubscription(initialSnapshot, options) {
  let snapshot = initialSnapshot;
  const listeners = /* @__PURE__ */ new Set();
  const equals = options?.equals ?? Object.is;
  function notify() {
    for (const listener of listeners) {
      listener();
    }
  }
  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getSnapshot() {
      return snapshot;
    },
    emit(nextSnapshot) {
      if (equals(snapshot, nextSnapshot)) {
        return;
      }
      snapshot = nextSnapshot;
      notify();
    },
    setSnapshot(nextSnapshot) {
      snapshot = nextSnapshot;
    },
    notify,
  };
}
function createStore(initialSnapshot, methods, options) {
  const clone = options?.deepClone ?? structuredClone;
  let resetSnapshot = clone(initialSnapshot);
  const sub = createStoreSubscription(initialSnapshot, options);
  const equals = options?.equals ?? Object.is;
  const contextCell = { value: void 0 };
  function getContext() {
    return contextCell.value;
  }
  let batchDepth = 0;
  let pendingNotify = false;
  function commit(next) {
    sub.setSnapshot(next);
    if (batchDepth > 0) {
      pendingNotify = true;
    } else {
      sub.notify();
    }
  }
  function batch(fn) {
    batchDepth++;
    try {
      fn();
    } finally {
      batchDepth--;
      if (batchDepth === 0 && pendingNotify) {
        pendingNotify = false;
        sub.notify();
      }
    }
  }
  function update(recipe) {
    const prev = sub.getSnapshot();
    const draft = clone(prev);
    recipe(draft);
    if (equals(prev, draft)) {
      return;
    }
    commit(draft);
  }
  function set(next) {
    const resolved = typeof next === 'function' ? next(sub.getSnapshot()) : next;
    if (equals(resolved, sub.getSnapshot())) {
      return;
    }
    commit(resolved);
  }
  function getByPath(path) {
    return getAtPath(sub.getSnapshot(), parsePath(path));
  }
  function setByPath(path, value) {
    const segments = parsePath(path);
    if (getAtPath(sub.getSnapshot(), segments) === value) {
      return;
    }
    const next = copyOnWritePath(sub.getSnapshot(), segments, value);
    commit(next);
  }
  function reset(next) {
    if (next === void 0) {
      commit(clone(resetSnapshot));
      return;
    }
    const resolved = typeof next === 'function' ? next(clone(resetSnapshot)) : next;
    resetSnapshot = clone(resolved);
    commit(resolved);
  }
  const store = {
    subscribe: sub.subscribe,
    getSnapshot: sub.getSnapshot,
    set,
    update,
    getByPath,
    setByPath,
    batch,
    reset,
    setContext(ctx) {
      contextCell.value = ctx;
    },
  };
  const api = {
    get: sub.getSnapshot,
    set: (next) => {
      store.set(next);
    },
    update: (recipe) => {
      store.update(recipe);
    },
    getByPath: (path) => store.getByPath(path),
    setByPath: (path, value) => {
      store.setByPath(path, value);
    },
    batch: (fn) => {
      store.batch(fn);
    },
    reset,
    getContext,
  };
  const domainMethods = methods(api);
  return Object.assign(store, domainMethods);
}

function createArrayMethods(api, arrayPath, defaults, methods) {
  const arraySegments = parsePath(arrayPath);
  function getArray() {
    return api.getByPath(arrayPath);
  }
  function setArray(next) {
    api.set(copyOnWritePath(api.get(), arraySegments, next));
  }
  const field = {
    add(overrides) {
      const item = structuredClone(defaults);
      if (overrides) {
        Object.assign(item, overrides);
      }
      setArray([...getArray(), item]);
    },
    remove(index) {
      const arr = getArray();
      if (index >= 0 && index < arr.length) {
        setArray(arr.toSpliced(index, 1));
      }
    },
    set(index, partial) {
      const arr = getArray();
      const item = arr[index];
      if (item) {
        setArray(arr.with(index, { ...item, ...partial }));
      }
    },
    setByPath(index, path, value) {
      const arr = getArray();
      const item = arr[index];
      if (item) {
        const segments = parsePath(path);
        const updatedItem = copyOnWritePath(item, segments, value);
        setArray(arr.with(index, updatedItem));
      }
    },
    move(from, to) {
      if (from === to) {
        return;
      }
      const arr = getArray();
      if (from >= 0 && from < arr.length && to >= 0 && to < arr.length) {
        const item = arr[from];
        if (item) {
          const next = [...arr];
          next.splice(from, 1);
          next.splice(to, 0, item);
          setArray(next);
        }
      }
    },
  };
  const arrayApi = { getArray, setArray };
  const domainMethods = methods !== void 0 ? methods(arrayApi) : {};
  return { ...field, ...domainMethods };
}

function createDerivedStore(sources, derive, options) {
  const equals = options?.equals ?? Object.is;
  function compute() {
    const snapshots = sources.map((s) => s.getSnapshot());
    return derive(...snapshots);
  }
  const sub = createStoreSubscription(compute());
  let listenerCount = 0;
  const unsubscribes = [];
  function recompute() {
    const next = compute();
    if (!equals(sub.getSnapshot(), next)) {
      sub.emit(next);
    }
  }
  function syncSnapshot() {
    const next = compute();
    if (!equals(sub.getSnapshot(), next)) {
      sub.setSnapshot(next);
    }
  }
  function subscribeToSources() {
    for (const source of sources) {
      unsubscribes.push(source.subscribe(recompute));
    }
  }
  function unsubscribeFromSources() {
    for (const unsub of unsubscribes) {
      unsub();
    }
    unsubscribes.length = 0;
  }
  return {
    subscribe(listener) {
      if (listenerCount === 0) {
        syncSnapshot();
        subscribeToSources();
      }
      listenerCount++;
      const unsub = sub.subscribe(listener);
      return () => {
        unsub();
        listenerCount--;
        if (listenerCount === 0) {
          unsubscribeFromSources();
        }
      };
    },
    getSnapshot() {
      return sub.getSnapshot();
    },
  };
}

const BUILTIN_KEYS = ['set', 'update', 'getByPath', 'setByPath', 'batch', 'reset'];
const NON_DOMAIN_KEYS = /* @__PURE__ */ new Set([
  'subscribe',
  'getSnapshot',
  'setContext',
  'reset',
  ...BUILTIN_KEYS,
]);
function createStoreDispatch(store, options) {
  let allowed = null;
  if (options !== void 0) {
    allowed = /* @__PURE__ */ new Set();
    const { builtin, domain } = options;
    if (builtin === true) {
      for (const k of BUILTIN_KEYS) {
        allowed.add(k);
      }
    } else if (builtin !== void 0) {
      for (const k of builtin) {
        allowed.add(k);
      }
    }
    if (domain === void 0 || domain === true) {
      for (const k of Object.keys(store)) {
        if (!NON_DOMAIN_KEYS.has(k)) {
          allowed.add(k);
        }
      }
    } else {
      for (const k of domain) {
        allowed.add(k);
      }
    }
  }
  return function dispatch(action, ...args) {
    if (allowed !== null && !allowed.has(action)) {
      throw new Error(`dispatch: action "${action}" is not in the allowed set`);
    }
    const method = store[action];
    if (typeof method !== 'function') {
      throw new Error(`dispatch: unknown action "${action}"`);
    }
    return method(...args);
  };
}

function produce(state, recipe) {
  const draft = structuredClone(state);
  recipe(draft);
  return draft;
}

function shallowEqual(a, b) {
  if (Object.is(a, b)) {
    return true;
  }
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) {
    return false;
  }
  const keysA = Object.keys(a);
  if (keysA.length !== Object.keys(b).length) {
    return false;
  }
  for (const key of keysA) {
    if (!Object.hasOwn(b, key) || !Object.is(a[key], b[key])) {
      return false;
    }
  }
  return true;
}

function watch(store, selectorOrCallback, callback, options) {
  let selector;
  let cb;
  if (callback === void 0) {
    selector = (snap) => snap;
    cb = selectorOrCallback;
  } else {
    selector = selectorOrCallback;
    cb = callback;
  }
  const equals = options?.equals ?? Object.is;
  let prev = selector(store.getSnapshot());
  return store.subscribe(() => {
    const next = selector(store.getSnapshot());
    if (!equals(prev, next)) {
      const old = prev;
      prev = next;
      cb(next, old);
    }
  });
}

//#region src/use-store.ts
function identity(x) {
  return x;
}
function useStore(store, arg2) {
  return useStoreCore(store, arg2);
}
function useStoreCore(store, arg2) {
  const opts = typeof arg2 === 'function' ? void 0 : arg2;
  const select = typeof arg2 === 'function' ? arg2 : opts?.select;
  const ctx = opts?.context;
  const equals = opts?.equals;
  if (ctx !== void 0) store.setContext?.(ctx);
  const sel = select ?? identity;
  const eq = equals ?? Object.is;
  const cache = reactExports.useRef(sel(store.getSnapshot()));
  const subscribe = (listener) => {
    return store.subscribe(() => {
      const next = sel(store.getSnapshot());
      if (!eq(cache.current, next)) {
        cache.current = next;
        listener();
      }
    });
  };
  const getSnapshot = () => {
    const next = sel(store.getSnapshot());
    if (eq(cache.current, next)) return cache.current;
    cache.current = next;
    return cache.current;
  };
  return reactExports.useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

//#region src/create-store-context.tsx
function createStoreContext(factory, options) {
  const {
    name = 'StoreContext',
    cleanup = (store) => {
      store.reset();
    },
  } = options ?? {};
  const Context = reactExports.createContext(null);
  const Provider = ({ children, initial, context }) => {
    const [store] = reactExports.useState(() => factory(initial));
    if (context !== void 0) store.setContext(context);
    reactExports.useEffect(() => {
      if (cleanup === null) return;
      return () => {
        cleanup(store);
      };
    }, [store]);
    return /* @__PURE__ */ jsxRuntimeExports.jsx(Context.Provider, {
      value: store,
      children,
    });
  };
  Provider.displayName = `${name}.Provider`;
  const useStoreContext = () => {
    const store = reactExports.useContext(Context);
    if (store === null)
      throw new Error(`[${name}] useStoreContext must be called inside <${name}.Provider>.`);
    return store;
  };
  function useSnapshot(selector, equals) {
    return useStoreCore(useStoreContext(), {
      select: selector,
      equals,
    });
  }
  return {
    Provider,
    useStoreContext,
    useSnapshot,
  };
}

//#region src/use-suspense-store.ts
var pendingPromises = /* @__PURE__ */ new WeakMap();
function getOrCreatePendingPromise(store) {
  const cached = pendingPromises.get(store);
  if (cached !== void 0) return cached;
  const { promise, resolve } = Promise.withResolvers();
  const unsubscribe = store.subscribe(() => {
    pendingPromises.delete(store);
    unsubscribe();
    resolve();
  });
  pendingPromises.set(store, promise);
  return promise;
}
function useSuspenseStore(store, select, options) {
  if (options?.context !== void 0) store.setContext?.(options.context);
  const state = reactExports.useSyncExternalStore(store.subscribe, () =>
    select(store.getSnapshot())
  );
  if (state.status === 'fulfilled') return state.data;
  if (state.status === 'rejected') throw state.error;
  throw getOrCreatePendingPromise(store);
}

export {
  createStore as a,
  createDerivedStore as b,
  createStoreContext as c,
  asyncIdle as d,
  asyncPending as e,
  asyncFulfilled as f,
  useSuspenseStore as g,
  asyncRejected as h,
  jsxRuntimeExports as j,
  shallowEqual as s,
  useStore as u,
};
//# sourceMappingURL=index-CHDL1A9q.js.map
