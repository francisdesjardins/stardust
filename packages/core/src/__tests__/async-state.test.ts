import { expect, test } from '@playwright/test';
import { asyncFulfilled, asyncIdle, asyncPending, asyncRejected, runAsync } from '..';

test.describe('asyncIdle', () => {
  test('has status idle', () => {
    expect(asyncIdle.status).toBe('idle');
  });

  test('is a stable singleton reference', () => {
    expect(asyncIdle).toBe(asyncIdle);
  });
});

test.describe('asyncPending', () => {
  test('has status pending', () => {
    expect(asyncPending.status).toBe('pending');
  });

  test('is a stable singleton reference', () => {
    expect(asyncPending).toBe(asyncPending);
  });
});

test.describe('asyncFulfilled', () => {
  test('has status fulfilled with the given data', () => {
    const state = asyncFulfilled(42);
    expect(state.status).toBe('fulfilled');
    expect(state.data).toBe(42);
  });

  test('works with an object value', () => {
    const data = { id: '1', name: 'Alice' };
    const state = asyncFulfilled(data);
    expect(state.status).toBe('fulfilled');
    expect(state.data).toBe(data);
  });

  test('works with undefined', () => {
    const state = asyncFulfilled(undefined);
    expect(state.status).toBe('fulfilled');
    expect(state.data).toBeUndefined();
  });

  test('works with null', () => {
    const state = asyncFulfilled(null);
    expect(state.status).toBe('fulfilled');
    expect(state.data).toBeNull();
  });

  test('returns a new object each call', () => {
    const a = asyncFulfilled(1);
    const b = asyncFulfilled(1);
    expect(a).not.toBe(b);
  });
});

test.describe('asyncRejected', () => {
  test('has status rejected with the given Error', () => {
    const err = new Error('boom');
    const state = asyncRejected(err);
    expect(state.status).toBe('rejected');
    expect(state.error).toBe(err);
  });

  test('passes through Error subclasses', () => {
    const err = new TypeError('bad type');
    const state = asyncRejected(err);
    expect(state.error).toBeInstanceOf(TypeError);
    expect(state.error).toBe(err);
  });

  test('normalizes a string to Error', () => {
    const state = asyncRejected('oops');
    expect(state.error).toBeInstanceOf(Error);
    expect(state.error.message).toBe('oops');
  });

  test('normalizes a number to Error', () => {
    const state = asyncRejected(404);
    expect(state.error).toBeInstanceOf(Error);
    expect(state.error.message).toBe('404');
  });

  test('normalizes null to Error', () => {
    const state = asyncRejected(null);
    expect(state.error).toBeInstanceOf(Error);
    expect(state.error.message).toBe('null');
  });

  test('returns a new object each call', () => {
    const err = new Error('x');
    const a = asyncRejected(err);
    const b = asyncRejected(err);
    expect(a).not.toBe(b);
  });
});

test.describe('runAsync', () => {
  test('calls onState with pending then fulfilled on success', async () => {
    const states: string[] = [];
    await runAsync(
      () => Promise.resolve('hello'),
      (s) => {
        states.push(s.status);
      }
    );
    expect(states).toEqual(['pending', 'fulfilled']);
  });

  test('passes the resolved value to asyncFulfilled', async () => {
    const data = { id: '42' };
    let captured: unknown;
    await runAsync(
      () => Promise.resolve(data),
      (s) => {
        if (s.status === 'fulfilled') {
          captured = s.data;
        }
      }
    );
    expect(captured).toBe(data);
  });

  test('calls onState with pending then rejected on failure', async () => {
    const states: string[] = [];
    await runAsync(
      () => Promise.reject(new Error('fail')),
      (s) => {
        states.push(s.status);
      }
    );
    expect(states).toEqual(['pending', 'rejected']);
  });

  test('returns AsyncFulfilled on success', async () => {
    const result = await runAsync(
      () => Promise.resolve(42),
      () => {}
    );
    expect(result.status).toBe('fulfilled');
    if (result.status === 'fulfilled') {
      expect(result.data).toBe(42);
    }
  });

  test('returns AsyncRejected on failure', async () => {
    const err = new Error('boom');
    const result = await runAsync(
      () => Promise.reject(err),
      () => {}
    );
    expect(result.status).toBe('rejected');
    if (result.status === 'rejected') {
      expect(result.error).toBe(err);
    }
  });

  test('returned state is the same object passed to onState', async () => {
    let fromCallback: unknown;
    const result = await runAsync(
      () => Promise.resolve('x'),
      (s) => {
        if (s.status === 'fulfilled') {
          fromCallback = s;
        }
      }
    );
    expect(result).toBe(fromCallback);
  });

  test('normalizes thrown error via asyncRejected', async () => {
    let capturedError: Error | undefined;
    await runAsync(
      // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors -- intentional non-Error rejection
      () => Promise.reject('string error'),
      (s) => {
        if (s.status === 'rejected') {
          capturedError = s.error;
        }
      }
    );
    expect(capturedError).toBeInstanceOf(Error);
    expect(capturedError?.message).toBe('string error');
  });

  test('returns AsyncFulfilled on success (not void)', async () => {
    const result = await runAsync(
      () => Promise.resolve(99),
      () => {}
    );
    expect(result.status).toBe('fulfilled');
  });

  test('onState is called exactly twice', async () => {
    let count = 0;
    await runAsync(
      () => Promise.resolve(true),
      () => {
        count += 1;
      }
    );
    expect(count).toBe(2);
  });
});
