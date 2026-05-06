import { expect, test } from '@playwright/test';
import { copyOnWritePath, getAtPath, parsePath, setAtPath } from '../path-utils';

// ── parsePath caching ──────────────────────────────────────────────────────

test.describe('parsePath caching', () => {
  test('returns the same reference for repeated calls', () => {
    const a = parsePath('user.address.city');
    const b = parsePath('user.address.city');
    expect(a).toBe(b);
  });

  test('returns frozen arrays', () => {
    const segments = parsePath('foo.bar');
    expect(Object.isFrozen(segments)).toBe(true);
  });

  test('different paths return different references', () => {
    const a = parsePath('x.y');
    const b = parsePath('x.z');
    expect(a).not.toBe(b);
  });

  test('parses simple key', () => {
    expect([...parsePath('count')]).toEqual(['count']);
  });

  test('parses dotted path', () => {
    expect([...parsePath('user.address.city')]).toEqual(['user', 'address', 'city']);
  });

  test('parses array index path', () => {
    expect([...parsePath('phones[0].label')]).toEqual(['phones', 0, 'label']);
  });

  test('parses mixed bracket and dot paths', () => {
    expect([...parsePath('a[1].b[2].c')]).toEqual(['a', 1, 'b', 2, 'c']);
  });

  test('empty string returns empty array', () => {
    expect([...parsePath('')]).toEqual([]);
  });

  test('bracket-only path (no leading key) returns numeric index', () => {
    expect([...parsePath('[0]')]).toEqual([0]);
  });

  test('bracket notation on root-level array followed by property', () => {
    expect([...parsePath('[2].name')]).toEqual([2, 'name']);
  });

  test('consecutive brackets are parsed as sequential indices', () => {
    expect([...parsePath('matrix[0][1]')]).toEqual(['matrix', 0, 1]);
  });
});

// ── copyOnWritePath ────────────────────────────────────────────────────────

test.describe('copyOnWritePath', () => {
  test('sets a top-level key', () => {
    const original = { count: 0, label: 'a' };
    const result = copyOnWritePath(original, parsePath('count'), 42);
    expect(result).toEqual({ count: 42, label: 'a' });
    expect(original.count).toBe(0); // original unchanged
  });

  test('returns a new root reference', () => {
    const original = { a: 1 };
    const result = copyOnWritePath(original, parsePath('a'), 2);
    expect(result).not.toBe(original);
  });

  test('preserves identity for unchanged siblings', () => {
    const b = { deep: true };
    const original = { a: 1, b };
    const result = copyOnWritePath(original, parsePath('a'), 2);
    expect(result.b).toBe(b); // same reference
  });

  test('sets a nested key (2 levels)', () => {
    const original = { user: { name: 'Alice' } };
    const result = copyOnWritePath(original, parsePath('user.name'), 'Bob');
    expect(result).toEqual({ user: { name: 'Bob' } });
    expect(original.user.name).toBe('Alice');
  });

  test('sets a deeply nested key (3 levels)', () => {
    const original = { user: { address: { city: 'Montreal' } }, scores: [1] };
    const result = copyOnWritePath(original, parsePath('user.address.city'), 'Toronto');
    expect(result.user.address.city).toBe('Toronto');
    expect(result.scores).toBe(original.scores); // unchanged branch
    expect(original.user.address.city).toBe('Montreal');
  });

  test('sets an array element by index', () => {
    const original = { items: ['a', 'b', 'c'] };
    const result = copyOnWritePath(original, parsePath('items[1]'), 'X');
    expect(result.items).toEqual(['a', 'X', 'c']);
    expect(original.items[1]).toBe('b');
  });

  test('sets a property on an array element', () => {
    const phones = [
      { number: '111', label: 'home' },
      { number: '222', label: 'work' },
    ];
    const original = { phones };
    const result = copyOnWritePath(original, parsePath('phones[0].label'), 'mobile');
    expect(result.phones[0]).toEqual({ number: '111', label: 'mobile' });
    expect(result.phones[1]).toBe(phones[1]); // other element unchanged
    expect(phones[0]?.label).toBe('home'); // original unchanged
  });

  test('returns original when path segment resolves to non-object', () => {
    const original = { a: 42 };
    const result = copyOnWritePath(original, parsePath('a.b'), 'x');
    expect(result).toBe(original);
  });

  test('returns original when path segment resolves to null', () => {
    const original = { a: null as { b: string } | null };
    const result = copyOnWritePath(original, parsePath('a.b'), 'x');
    expect(result).toBe(original);
  });

  test('empty segments returns value as root', () => {
    const result = copyOnWritePath({ a: 1 }, [], 'replaced');
    expect(result).toBe('replaced');
  });

  test('handles array root', () => {
    const original = [{ x: 1 }, { x: 2 }];
    const result = copyOnWritePath(original, [0, 'x'], 99);
    expect(result).toEqual([{ x: 99 }, { x: 2 }]);
    expect(result).not.toBe(original);
    expect(result[1]).toBe(original[1]);
  });

  test('returns original when intermediate segment is undefined', () => {
    const original = { a: { b: 1 } };
    const sparse = Array.from<string | number>({ length: 2 }); // [undefined, undefined]
    const result = copyOnWritePath(original, sparse, 99);
    expect(result).toBe(original);
  });
});

// ── getAtPath / setAtPath (regression) ────────────────────────────────────

test.describe('getAtPath', () => {
  test('returns undefined for missing path', () => {
    expect(getAtPath({ a: 1 }, parsePath('b'))).toBeUndefined();
  });

  test('returns undefined when traversing through null', () => {
    expect(getAtPath({ a: null }, parsePath('a.b'))).toBeUndefined();
  });
});

test.describe('setAtPath', () => {
  test('sets top-level key in-place', () => {
    const obj = { x: 0 };
    setAtPath(obj, parsePath('x'), 5);
    expect(obj.x).toBe(5);
  });

  test('bails on null intermediate', () => {
    const obj = { a: null as { b: number } | null };
    setAtPath(obj, parsePath('a.b'), 5);
    expect(obj.a).toBeNull(); // unchanged
  });

  test('bails on non-object non-null intermediate', () => {
    // path ['a','b','c','d'] — at i=2, curr becomes 42 (not an object) → early return
    const obj = { a: { b: 42 } } as Record<string, unknown>;
    setAtPath(obj, ['a', 'b', 'c', 'd'], 99);
    expect((obj['a'] as Record<string, unknown>)['b']).toBe(42); // unchanged
  });

  test('bails on undefined segment', () => {
    const obj = { a: { b: 1 } } as Record<string, unknown>;
    const sparse = Array.from<string | number>({ length: 2 }); // [undefined, undefined]
    setAtPath(obj, sparse, 99);
    expect(obj).toEqual({ a: { b: 1 } }); // unchanged
  });
});
