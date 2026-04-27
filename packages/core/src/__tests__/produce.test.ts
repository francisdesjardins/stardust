import { test, expect } from '@playwright/test';
import { produce } from '..';

test.describe('produce', () => {
  test('returns a new object without mutating the original', () => {
    const original = { name: 'Alice', age: 30 };
    const next = produce(original, (draft) => {
      draft.name = 'Bob';
    });
    expect(next).toEqual({ name: 'Bob', age: 30 });
    expect(original).toEqual({ name: 'Alice', age: 30 });
    expect(next).not.toBe(original);
  });

  test('supports nested object mutations', () => {
    const original = { user: { name: 'Alice', scores: [1, 2, 3] } };
    const next = produce(original, (draft) => {
      draft.user.name = 'Bob';
      draft.user.scores.push(4);
    });
    expect(next.user.name).toBe('Bob');
    expect(next.user.scores).toEqual([1, 2, 3, 4]);
    expect(original.user.name).toBe('Alice');
    expect(original.user.scores).toEqual([1, 2, 3]);
  });

  test('supports deleting properties', () => {
    const original: { a: number; b?: number } = { a: 1, b: 2 };
    const next = produce(original, (draft) => {
      delete draft.b;
    });
    expect(next).toEqual({ a: 1 });
    expect(original).toEqual({ a: 1, b: 2 });
  });

  test('supports array state', () => {
    const original = [1, 2, 3];
    const next = produce(original, (draft) => {
      draft.push(4);
      draft[0] = 10;
    });
    expect(next).toEqual([10, 2, 3, 4]);
    expect(original).toEqual([1, 2, 3]);
  });

  test('handles empty recipe (no-op clone)', () => {
    const original = { x: 1 };
    const next = produce(original, () => {
      /* no mutations */
    });
    expect(next).toEqual({ x: 1 });
    expect(next).not.toBe(original);
  });

  test('supports Date values in snapshot', () => {
    const date = new Date('2025-01-01T00:00:00.000Z');
    const original = { createdAt: date };
    const next = produce(original, (draft) => {
      draft.createdAt = new Date('2026-01-01T00:00:00.000Z');
    });
    expect(next.createdAt.toISOString()).toBe('2026-01-01T00:00:00.000Z');
    expect(original.createdAt.toISOString()).toBe('2025-01-01T00:00:00.000Z');
  });

  test('supports Map values in snapshot', () => {
    const original = { lookup: new Map([['a', 1]]) };
    const next = produce(original, (draft) => {
      draft.lookup.set('b', 2);
    });
    expect(next.lookup.get('b')).toBe(2);
    expect(original.lookup.has('b')).toBe(false);
  });

  test('works with primitive state', () => {
    const next = produce(42, () => {
      /* primitives are cloned by value — recipe can't mutate them */
    });
    expect(next).toBe(42);
  });
});
