import { expect, test } from '@playwright/test';
import { createSingleFlight, createFirstFlight, createLastFlight, safeSingleFlight } from '..';

// ---------------------------------------------------------------------------
// 'first' mode (default)
// ---------------------------------------------------------------------------

test('N concurrent callers share one execution — task called once', async () => {
  const flight = createSingleFlight();
  let callCount = 0;

  const task = () =>
    new Promise<number>((res) => {
      callCount++;
      setTimeout(() => {
        res(42);
      }, 10);
    });

  const [a, b, c] = await Promise.all([flight(task), flight(task), flight(task)]);

  expect(callCount).toBe(1);
  expect(a).toBe(42);
  expect(b).toBe(42);
  expect(c).toBe(42);
});

test('gate clears after settlement — next call starts a fresh execution', async () => {
  const flight = createSingleFlight();
  let callCount = 0;

  const task = () =>
    new Promise<number>((res) => {
      callCount++;
      res(callCount);
    });

  const first = await flight(task);
  const second = await flight(task);

  expect(callCount).toBe(2);
  expect(first).toBe(1);
  expect(second).toBe(2);
});

test('error propagates to all concurrent callers', async () => {
  const flight = createSingleFlight();
  const err = new Error('task failed');

  const task = () => Promise.reject<number>(err);

  const results = await Promise.allSettled([flight(task), flight(task)]);

  for (const r of results) {
    expect(r.status).toBe('rejected');
    if (r.status === 'rejected') {
      expect(r.reason).toBe(err);
    }
  }
});

test('gate clears after error — next call can start fresh', async () => {
  const flight = createSingleFlight();
  let callCount = 0;

  await flight(() => {
    callCount++;
    return Promise.reject(new Error('fail'));
  }).catch(() => {});

  const result = await flight(() => {
    callCount++;
    return Promise.resolve('ok');
  });

  expect(callCount).toBe(2);
  expect(result).toBe('ok');
});

test('safeSingleFlight singleton works like createSingleFlight', async () => {
  let callCount = 0;
  const task = () =>
    new Promise<string>((res) => {
      callCount++;
      res('done');
    });

  await Promise.all([safeSingleFlight(task), safeSingleFlight(task)]);
  expect(callCount).toBe(1);
});

test('different flights are independent gates', async () => {
  const flightA = createSingleFlight();
  const flightB = createSingleFlight();
  let countA = 0;
  let countB = 0;

  await Promise.all([
    flightA(() => {
      countA++;
      return Promise.resolve();
    }),
    flightB(() => {
      countB++;
      return Promise.resolve();
    }),
  ]);

  expect(countA).toBe(1);
  expect(countB).toBe(1);
});

test('createFirstFlight is an alias for first-wins behaviour', async () => {
  const flight = createFirstFlight();
  let callCount = 0;

  const [a, b] = await Promise.all([
    flight(() => {
      callCount++;
      return new Promise<number>((res) =>
        setTimeout(() => {
          res(1);
        }, 10)
      );
    }),
    flight(() => {
      callCount++;
      return Promise.resolve(2);
    }),
  ]);

  expect(callCount).toBe(1);
  expect(a).toBe(1);
  expect(b).toBe(1);
});

// ---------------------------------------------------------------------------
// 'last' mode
// ---------------------------------------------------------------------------

test.describe("'last' mode", () => {
  test('last task wins — all concurrent callers receive its value', async () => {
    const flight = createLastFlight();
    const order: number[] = [];

    const makeTask = (id: number, delay: number, value: string) => () =>
      new Promise<string>((res) => {
        order.push(id);
        setTimeout(() => {
          res(value);
        }, delay);
      });

    // Call 1 starts immediately (50 ms delay).
    // Call 2 arrives synchronously — supersedes call 1 (20 ms delay).
    // Call 3 arrives synchronously — supersedes call 2 (5 ms delay, fastest).
    const [a, b, c] = await Promise.all([
      flight(makeTask(1, 50, 'first')),
      flight(makeTask(2, 20, 'second')),
      flight(makeTask(3, 5, 'last')),
    ]);

    // All three tasks were started (no task is skipped, only results are discarded)
    expect(order).toEqual([1, 2, 3]);
    // All callers get the last task's value
    expect(a).toBe('last');
    expect(b).toBe('last');
    expect(c).toBe('last');
  });

  test('superseded task signal is aborted immediately', async () => {
    const flight = createLastFlight();
    let capturedSignal: AbortSignal | null = null;

    // First call — capture signal, hang forever
    const p1 = flight((signal) => {
      capturedSignal = signal;
      return new Promise<string>(() => {});
    });

    // Second call — supersedes first
    const p2 = flight(() => Promise.resolve('done'));

    expect(capturedSignal).not.toBeNull();
    expect(capturedSignal!.aborted).toBe(true);

    await expect(p2).resolves.toBe('done');
    await expect(p1).resolves.toBe('done'); // same deferred
  });

  test('gate clears after last task settles — next call starts fresh', async () => {
    const flight = createLastFlight();
    let callCount = 0;

    const first = await flight(() => {
      callCount++;
      return Promise.resolve('first');
    });

    const second = await flight(() => {
      callCount++;
      return Promise.resolve('second');
    });

    expect(callCount).toBe(2);
    expect(first).toBe('first');
    expect(second).toBe('second');
  });

  test('error from the last task reaches all waiters', async () => {
    const flight = createLastFlight();
    const err = new Error('last failed');

    // First task hangs; second supersedes with an error
    const p1 = flight(() => new Promise<string>(() => {}));
    const p2 = flight(() => Promise.reject<string>(err));

    const [r1, r2] = await Promise.allSettled([p1, p2]);
    expect(r1.status).toBe('rejected');
    expect(r2.status).toBe('rejected');
    if (r1.status === 'rejected') expect(r1.reason).toBe(err);
    if (r2.status === 'rejected') expect(r2.reason).toBe(err);
  });

  test('error from superseded task does not affect waiters', async () => {
    const flight = createLastFlight();

    // First task will reject; second supersedes with a value
    const p1 = flight(
      () =>
        new Promise<string>((_, rej) =>
          setTimeout(() => {
            rej(new Error('old'));
          }, 5)
        )
    );
    const p2 = flight(() => Promise.resolve('winner'));

    const [r1, r2] = await Promise.allSettled([p1, p2]);
    expect(r1.status).toBe('fulfilled');
    expect(r2.status).toBe('fulfilled');
    if (r1.status === 'fulfilled') expect(r1.value).toBe('winner');
    if (r2.status === 'fulfilled') expect(r2.value).toBe('winner');
  });

  test('gate clears after last task errors — next call recovers', async () => {
    const flight = createLastFlight();

    await flight(() => Promise.reject(new Error('fail'))).catch(() => {});

    const result = await flight(() => Promise.resolve('recovered'));
    expect(result).toBe('recovered');
  });
});
