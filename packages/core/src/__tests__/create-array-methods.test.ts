import { expect, test } from '@playwright/test';
import { createArrayMethods, createStore } from '..';

type Phone = { number: string; label: string };

const phoneOps = createArrayMethods<Phone>({ number: '', label: 'mobile' });

function makeStore(initial: Phone[] = []) {
  return createStore({ phones: initial }, (api) => ({
    phones: phoneOps.mount(api, 'phones'),
  }));
}

test.describe('createArrayMethods', () => {
  // ── add ──────────────────────────────────────────────────────────────────

  test('add() appends a default item', () => {
    const store = makeStore();
    store.phones.add();
    expect(store.getSnapshot().phones).toEqual([{ number: '', label: 'mobile' }]);
  });

  test('add(overrides) merges overrides onto defaults', () => {
    const store = makeStore();
    store.phones.add({ number: '5141234567' });
    expect(store.getSnapshot().phones).toEqual([{ number: '5141234567', label: 'mobile' }]);
  });

  test('add() deep-clones defaults so items are independent', () => {
    type NestedItem = { meta: { tag: string } };
    const nestedOps = createArrayMethods<NestedItem>({ meta: { tag: 'default' } });
    const nested = createStore({ items: [] as NestedItem[] }, (api) => ({
      items: nestedOps.mount(api, 'items'),
    }));
    nested.items.add();
    nested.items.add();
    nested.items.set(0, { meta: { tag: 'changed' } });
    const snap = nested.getSnapshot();
    expect(snap.items[0]?.meta.tag).toBe('changed');
    expect(snap.items[1]?.meta.tag).toBe('default');
  });

  test('add() notifies listeners', () => {
    const store = makeStore();
    let calls = 0;
    store.subscribe(() => {
      calls++;
    });
    store.phones.add();
    expect(calls).toBe(1);
  });

  // ── remove ───────────────────────────────────────────────────────────────

  test('remove() deletes the item at index', () => {
    const store = makeStore([
      { number: '111', label: 'home' },
      { number: '222', label: 'work' },
      { number: '333', label: 'mobile' },
    ]);
    store.phones.remove(1);
    expect(store.getSnapshot().phones).toEqual([
      { number: '111', label: 'home' },
      { number: '333', label: 'mobile' },
    ]);
  });

  test('remove() is a no-op for out-of-bounds index', () => {
    const store = makeStore([{ number: '111', label: 'home' }]);
    store.phones.remove(5);
    expect(store.getSnapshot().phones).toHaveLength(1);
  });

  test('remove() is a no-op for negative index', () => {
    const store = makeStore([{ number: '111', label: 'home' }]);
    store.phones.remove(-1);
    expect(store.getSnapshot().phones).toHaveLength(1);
  });

  // ── set ──────────────────────────────────────────────────────────────────

  test('set() updates a single property on the item', () => {
    const store = makeStore([{ number: '', label: 'mobile' }]);
    store.phones.set(0, { number: '5141234567' });
    expect(store.getSnapshot().phones[0]?.number).toBe('5141234567');
  });

  test('set() preserves other properties', () => {
    const store = makeStore([{ number: '111', label: 'home' }]);
    store.phones.set(0, { number: '222' });
    expect(store.getSnapshot().phones[0]).toEqual({ number: '222', label: 'home' });
  });

  test('set() patches multiple properties at once', () => {
    const store = makeStore([{ number: '111', label: 'home' }]);
    store.phones.set(0, { number: '222', label: 'work' });
    expect(store.getSnapshot().phones[0]).toEqual({ number: '222', label: 'work' });
  });

  test('set() is a no-op for out-of-bounds index', () => {
    const store = makeStore([]);
    store.phones.set(5, { number: 'x' });
    expect(store.getSnapshot().phones).toHaveLength(0);
  });

  test('set() does not mutate the previous snapshot', () => {
    const store = makeStore([{ number: '111', label: 'home' }]);
    const before = store.getSnapshot();
    store.phones.set(0, { number: '222' });
    expect(before.phones[0]?.number).toBe('111');
  });

  // ── move ─────────────────────────────────────────────────────────────────

  test('move() reorders items forward', () => {
    const store = makeStore([
      { number: 'a', label: '1' },
      { number: 'b', label: '2' },
      { number: 'c', label: '3' },
    ]);
    store.phones.move(0, 2);
    expect(store.getSnapshot().phones.map((p) => p.number)).toEqual(['b', 'c', 'a']);
  });

  test('move() reorders items backward', () => {
    const store = makeStore([
      { number: 'a', label: '1' },
      { number: 'b', label: '2' },
      { number: 'c', label: '3' },
    ]);
    store.phones.move(2, 0);
    expect(store.getSnapshot().phones.map((p) => p.number)).toEqual(['c', 'a', 'b']);
  });

  test('move() is a no-op when from === to', () => {
    const store = makeStore([{ number: 'a', label: '1' }]);
    let calls = 0;
    store.subscribe(() => {
      calls++;
    });
    store.phones.move(0, 0);
    expect(calls).toBe(0);
  });

  test('move() is a no-op for out-of-bounds indices', () => {
    const store = makeStore([{ number: 'a', label: '1' }]);
    store.phones.move(0, 5);
    expect(store.getSnapshot().phones).toHaveLength(1);
  });

  // ── immutability & structural sharing ────────────────────────────────

  test('add() does not mutate the previous snapshot', () => {
    const store = makeStore([{ number: '111', label: 'home' }]);
    const before = store.getSnapshot();
    store.phones.add({ number: '222' });
    expect(before.phones).toHaveLength(1);
    expect(store.getSnapshot().phones).toHaveLength(2);
  });

  test('remove() does not mutate the previous snapshot', () => {
    const store = makeStore([
      { number: '111', label: 'home' },
      { number: '222', label: 'work' },
    ]);
    const before = store.getSnapshot();
    store.phones.remove(0);
    expect(before.phones).toHaveLength(2);
    expect(before.phones[0]?.number).toBe('111');
  });

  test('move() does not mutate the previous snapshot', () => {
    const store = makeStore([
      { number: 'a', label: '1' },
      { number: 'b', label: '2' },
      { number: 'c', label: '3' },
    ]);
    const before = store.getSnapshot();
    store.phones.move(0, 2);
    expect(before.phones.map((p) => p.number)).toEqual(['a', 'b', 'c']);
  });

  test('set() preserves identity of unchanged items', () => {
    const store = makeStore([
      { number: '111', label: 'home' },
      { number: '222', label: 'work' },
    ]);
    const before = store.getSnapshot();
    store.phones.set(0, { number: '999' });
    const after = store.getSnapshot();
    expect(after.phones[0]).not.toBe(before.phones[0]); // changed item
    expect(after.phones[1]).toBe(before.phones[1]); // unchanged item keeps identity
  });

  test('setByPath() preserves identity of unchanged items', () => {
    const store = makeStore([
      { number: '111', label: 'home' },
      { number: '222', label: 'work' },
    ]);
    const before = store.getSnapshot();
    store.phones.setByPath(0, 'number', '999');
    const after = store.getSnapshot();
    expect(after.phones[0]).not.toBe(before.phones[0]);
    expect(after.phones[1]).toBe(before.phones[1]);
  });

  // ── setByPath ───────────────────────────────────────────────────────────

  test('setByPath() updates a top-level property via typed path', () => {
    const store = makeStore([{ number: '111', label: 'home' }]);
    store.phones.setByPath(0, 'number', '222');
    expect(store.getSnapshot().phones[0]?.number).toBe('222');
  });

  test('setByPath() preserves other properties', () => {
    const store = makeStore([{ number: '111', label: 'home' }]);
    store.phones.setByPath(0, 'label', 'work');
    expect(store.getSnapshot().phones[0]).toEqual({ number: '111', label: 'work' });
  });

  test('setByPath() is a no-op for out-of-bounds index', () => {
    const store = makeStore([]);
    store.phones.setByPath(5, 'number', 'x');
    expect(store.getSnapshot().phones).toHaveLength(0);
  });

  test('setByPath() does not mutate the previous snapshot', () => {
    const store = makeStore([{ number: '111', label: 'home' }]);
    const before = store.getSnapshot();
    store.phones.setByPath(0, 'number', '222');
    expect(before.phones[0]?.number).toBe('111');
  });

  test('setByPath() updates a nested property', () => {
    type Item = { meta: { tag: string; count: number } };
    const itemOps = createArrayMethods<Item>({ meta: { tag: '', count: 0 } });
    const nested = createStore({ items: [] as Item[] }, (api) => ({
      items: itemOps.mount(api, 'items'),
    }));
    nested.items.add({ meta: { tag: 'hello', count: 1 } });
    nested.items.setByPath(0, 'meta.tag', 'updated');
    const snap = nested.getSnapshot();
    expect(snap.items[0]?.meta.tag).toBe('updated');
    expect(snap.items[0]?.meta.count).toBe(1);
  });

  // ── upsert ──────────────────────────────────────────────────────────────

  test('upsert() replaces a matching item', () => {
    const store = makeStore([
      { number: '111', label: 'home' },
      { number: '222', label: 'work' },
    ]);
    store.phones.upsert({ number: '999', label: 'work' }, function (item) {
      return item.label === this.label;
    });
    expect(store.getSnapshot().phones).toEqual([
      { number: '111', label: 'home' },
      { number: '999', label: 'work' },
    ]);
  });

  test('upsert() appends when no match', () => {
    const store = makeStore([{ number: '111', label: 'home' }]);
    store.phones.upsert({ number: '222', label: 'work' }, function (item) {
      return item.label === this.label;
    });
    expect(store.getSnapshot().phones).toEqual([
      { number: '111', label: 'home' },
      { number: '222', label: 'work' },
    ]);
  });

  test('upsert() handles an array of needles in one write', () => {
    const store = makeStore([
      { number: '111', label: 'home' },
      { number: '222', label: 'work' },
    ]);
    let notifications = 0;
    store.subscribe(() => {
      notifications++;
    });
    store.phones.upsert(
      [
        { number: '999', label: 'home' },
        { number: '333', label: 'mobile' },
      ],
      function (item) {
        return item.label === this.label;
      }
    );
    expect(store.getSnapshot().phones).toEqual([
      { number: '999', label: 'home' },
      { number: '222', label: 'work' },
      { number: '333', label: 'mobile' },
    ]);
    expect(notifications).toBe(1);
  });

  test('upsert() preserves identity of unchanged items', () => {
    const store = makeStore([
      { number: '111', label: 'home' },
      { number: '222', label: 'work' },
    ]);
    const before = store.getSnapshot();
    store.phones.upsert({ number: '999', label: 'work' }, function (item) {
      return item.label === this.label;
    });
    const after = store.getSnapshot();
    expect(after.phones[0]).toBe(before.phones[0]);
    expect(after.phones[1]).not.toBe(before.phones[1]);
  });

  test('upsert() does not mutate the previous snapshot', () => {
    const store = makeStore([{ number: '111', label: 'home' }]);
    const before = store.getSnapshot();
    store.phones.upsert({ number: '999', label: 'home' }, function (item) {
      return item.label === this.label;
    });
    expect(before.phones[0]?.number).toBe('111');
  });
});
