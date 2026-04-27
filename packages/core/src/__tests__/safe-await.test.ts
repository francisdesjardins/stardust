import { expect, test } from '@playwright/test';
import { safeAwait } from '..';

test('resolved promise returns [null, result]', async () => {
  const [err, result] = await safeAwait(Promise.resolve(42));
  expect(err).toBeNull();
  expect(result).toBe(42);
});

test('rejected promise returns [Error, null]', async () => {
  const [err, result] = await safeAwait(Promise.reject(new Error('boom')));
  expect(err).toBeInstanceOf(Error);
  expect(err?.message).toBe('boom');
  expect(result).toBeNull();
});

test('non-Error thrown value is normalized to Error', async () => {
  // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
  const [err] = await safeAwait(Promise.reject('string error'));
  expect(err).toBeInstanceOf(Error);
  expect(err?.message).toBe('string error');
});

test('thrown number is normalized to Error', async () => {
  // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
  const [err] = await safeAwait(Promise.reject(404));
  expect(err).toBeInstanceOf(Error);
  expect(err?.message).toBe('404');
});

test('null rejection is normalized to Error', async () => {
  // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
  const [err] = await safeAwait(Promise.reject(null));
  expect(err).toBeInstanceOf(Error);
});

test('resolved value is null when promise rejects', async () => {
  const [, result] = await safeAwait(Promise.reject(new Error('x')));
  expect(result).toBeNull();
});

test('works with async functions', async () => {
  const [err, val] = await safeAwait(Promise.resolve('hello'));
  expect(err).toBeNull();
  expect(val).toBe('hello');
});
