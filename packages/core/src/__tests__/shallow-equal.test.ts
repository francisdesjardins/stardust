import { expect, test } from '@playwright/test';
import { shallowEqual } from '..';

test.describe('shallowEqual', () => {
  // ── Primitives ──────────────────────────────────────────────────────────────

  test('returns true for identical primitives', () => {
    expect(shallowEqual(1, 1)).toBe(true);
    expect(shallowEqual('a', 'a')).toBe(true);
    expect(shallowEqual(true, true)).toBe(true);
    expect(shallowEqual(null, null)).toBe(true);
    expect(shallowEqual(undefined, undefined)).toBe(true);
  });

  test('returns false for different primitives', () => {
    expect(shallowEqual(1, 2)).toBe(false);
    expect(shallowEqual('a', 'b')).toBe(false);
    expect(shallowEqual(true, false)).toBe(false);
  });

  test('handles NaN correctly (NaN === NaN via Object.is)', () => {
    expect(shallowEqual(NaN, NaN)).toBe(true);
  });

  test('distinguishes +0 and -0', () => {
    expect(shallowEqual(0, -0)).toBe(false);
  });

  // ── Null / undefined vs objects ─────────────────────────────────────────────

  test('returns false for null vs object', () => {
    expect(shallowEqual(null, {} as unknown as null)).toBe(false);
    expect(shallowEqual({} as unknown as null, null)).toBe(false);
  });

  test('returns false for undefined vs object', () => {
    expect(shallowEqual(undefined, {} as unknown as undefined)).toBe(false);
  });

  // ── Objects ─────────────────────────────────────────────────────────────────

  test('returns true for same reference', () => {
    const obj = { a: 1 };
    expect(shallowEqual(obj, obj)).toBe(true);
  });

  test('returns true for equal flat objects', () => {
    expect(shallowEqual({ a: 1, b: 'x' }, { a: 1, b: 'x' })).toBe(true);
  });

  test('returns false when values differ', () => {
    expect(shallowEqual({ a: 1 }, { a: 2 })).toBe(false);
  });

  test('returns false when key count differs', () => {
    expect(shallowEqual({ a: 1 }, { a: 1, b: 2 } as { a: number })).toBe(false);
    expect(shallowEqual({ a: 1, b: 2 }, { a: 1 } as { a: number; b: number })).toBe(false);
  });

  test('returns false when keys differ', () => {
    expect(shallowEqual({ a: 1 }, { b: 1 })).toBe(false);
  });

  test('returns false for nested objects (different references)', () => {
    const inner1 = { x: 1 };
    const inner2 = { x: 1 };
    expect(shallowEqual({ a: inner1 }, { a: inner2 })).toBe(false);
  });

  test('returns true for nested objects with same reference', () => {
    const inner = { x: 1 };
    expect(shallowEqual({ a: inner }, { a: inner })).toBe(true);
  });

  test('returns true for empty objects', () => {
    expect(shallowEqual({}, {})).toBe(true);
  });

  // ── Arrays ──────────────────────────────────────────────────────────────────

  test('returns true for equal arrays', () => {
    expect(shallowEqual([1, 2, 3], [1, 2, 3])).toBe(true);
  });

  test('returns false for arrays with different length', () => {
    expect(shallowEqual([1, 2], [1, 2, 3])).toBe(false);
  });

  test('returns false for arrays with different values', () => {
    expect(shallowEqual([1, 2, 3], [1, 2, 4])).toBe(false);
  });

  test('returns true for empty arrays', () => {
    expect(shallowEqual([], [])).toBe(true);
  });
});
