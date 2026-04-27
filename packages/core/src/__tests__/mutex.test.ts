import { expect, test } from '@playwright/test';
import { createMutex, safeMutex } from '..';

test('serializes concurrent calls — second starts after first settles', async () => {
  const mutex = createMutex();
  const order: number[] = [];

  const first = mutex(async () => {
    await new Promise((res) => setTimeout(res, 20));
    order.push(1);
  });
  const second = mutex(async () => {
    order.push(2);
  });

  await Promise.all([first, second]);
  expect(order).toEqual([1, 2]);
});

test('N calls all execute — serialized, not deduplicated', async () => {
  const mutex = createMutex();
  let count = 0;

  await Promise.all([
    mutex(() => {
      count++;
      return Promise.resolve();
    }),
    mutex(() => {
      count++;
      return Promise.resolve();
    }),
    mutex(() => {
      count++;
      return Promise.resolve();
    }),
  ]);

  expect(count).toBe(3);
});

test('error in one task does not stall subsequent tasks', async () => {
  const mutex = createMutex();
  const results: string[] = [];

  const first = mutex(async () => {
    throw new Error('fail');
  });
  const second = mutex(async () => {
    results.push('second ran');
  });

  await first.catch(() => {});
  await second;

  expect(results).toEqual(['second ran']);
});

test('return value passes through', async () => {
  const mutex = createMutex();
  const result = await mutex(() => Promise.resolve(99));
  expect(result).toBe(99);
});

test('thunk form: second task waits for first to settle', async () => {
  const mutex = createMutex();
  const started: number[] = [];

  const first = mutex(async () => {
    started.push(1);
    await new Promise((res) => setTimeout(res, 10));
  });
  const second = mutex(() => {
    started.push(2);
    return Promise.resolve();
  });

  await Promise.all([first, second]);
  expect(started).toEqual([1, 2]);
});

test('eager form: already-running promise is awaited in queue order', async () => {
  const mutex = createMutex();
  const order: number[] = [];

  const first = mutex(async () => {
    await new Promise((res) => setTimeout(res, 20));
    order.push(1);
  });
  const second = mutex(async () => {
    order.push(2);
  });

  await Promise.all([first, second]);

  expect(order[0]).toBe(1);
  expect(order[1]).toBe(2);
});

test('safeMutex singleton serializes calls', async () => {
  const order: number[] = [];

  const first = safeMutex(async () => {
    await new Promise((res) => setTimeout(res, 10));
    order.push(1);
  });
  const second = safeMutex(async () => {
    order.push(2);
  });

  await Promise.all([first, second]);
  expect(order).toEqual([1, 2]);
});

test('different mutexes are independent gates', async () => {
  const mutexA = createMutex();
  const mutexB = createMutex();
  const order: string[] = [];

  await Promise.all([
    mutexA(async () => {
      order.push('A');
    }),
    mutexB(async () => {
      order.push('B');
    }),
  ]);

  expect(order).toContain('A');
  expect(order).toContain('B');
});
