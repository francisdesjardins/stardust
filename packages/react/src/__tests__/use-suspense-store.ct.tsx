import { expect, test } from '@playwright/experimental-ct-react';
import { ContextHarness, FulfilledHarness, RejectedHarness } from './use-suspense-store.story';

test.describe('useSuspenseStore — fulfilled', () => {
  test('shows loading fallback while store is idle (suspended)', async ({ mount }) => {
    const component = await mount(<FulfilledHarness />);
    await expect(component.getByTestId('loading')).toBeVisible();
    await expect(component.getByTestId('user-name')).not.toBeVisible();
  });

  test('renders data after store transitions to fulfilled', async ({ mount }) => {
    const component = await mount(<FulfilledHarness />);
    await component.getByRole('button', { name: 'Fulfill' }).click();
    await expect(component.getByTestId('user-name')).toHaveText('Alice');
    await expect(component.getByTestId('loading')).not.toBeVisible();
  });

  test('shows loading fallback again after transitioning back to pending', async ({ mount }) => {
    const component = await mount(<FulfilledHarness />);
    await component.getByRole('button', { name: 'Fulfill' }).click();
    await expect(component.getByTestId('user-name')).toHaveText('Alice');

    await component.getByRole('button', { name: 'Pend' }).click();
    await expect(component.getByTestId('loading')).toBeVisible();
    await expect(component.getByTestId('user-name')).not.toBeVisible();

    // Fulfill again to restore state for subsequent tests
    await component.getByRole('button', { name: 'Fulfill' }).click();
    await expect(component.getByTestId('user-name')).toHaveText('Alice');
  });
});

test.describe('useSuspenseStore — rejected', () => {
  test('shows loading fallback while store is idle (suspended)', async ({ mount }) => {
    const component = await mount(<RejectedHarness />);
    await expect(component.getByTestId('loading')).toBeVisible();
    await expect(component.getByTestId('error')).not.toBeVisible();
  });

  test('shows error fallback after store transitions to rejected', async ({ mount }) => {
    const component = await mount(<RejectedHarness />);
    await component.getByRole('button', { name: 'Reject' }).click();
    await expect(component.getByTestId('error')).toHaveText('Error caught');
    await expect(component.getByTestId('loading')).not.toBeVisible();
  });
});

test.describe('useSuspenseStore — context injection', () => {
  test('shows loading fallback while store is idle', async ({ mount }) => {
    const component = await mount(<ContextHarness />);
    await expect(component.getByTestId('loading')).toBeVisible();
    await expect(component.getByTestId('user-name')).not.toBeVisible();
  });

  test('renders data derived from injected context after fulfillment', async ({ mount }) => {
    const component = await mount(<ContextHarness />);
    await component.getByRole('button', { name: 'Fulfill' }).click();
    await expect(component.getByTestId('user-name')).toHaveText('Hello from context');
    await expect(component.getByTestId('loading')).not.toBeVisible();
  });
});
