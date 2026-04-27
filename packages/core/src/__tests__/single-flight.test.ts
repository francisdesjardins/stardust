import { expect, test } from '@playwright/test';
import { createSingleFlight, safeSingleFlight } from '..';

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

  expect(results[0]?.status).toBe('rejected');
  expect(results[1]?.status).toBe('rejected');
  if (results[0]?.status === 'rejected') {
    expect(results[0].reason).toBe(err);
  }
  if (results[1]?.status === 'rejected') {
    expect(results[1].reason).toBe(err);
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
