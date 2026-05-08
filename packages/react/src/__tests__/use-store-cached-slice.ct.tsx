import { expect, test } from '@playwright/experimental-ct-react';
import {
  AutoRefreshHarness,
  MultiSubscriberHarness,
  SelectorHarness,
} from './use-store-cached-slice/harnesses.story';

test.describe('useStoreCachedSlice', () => {
  test.describe('auto-refresh on mount', () => {
    test('transitions idle → fresh on first mount when onExpire is configured', async ({
      mount,
    }) => {
      const component = await mount(<AutoRefreshHarness />);
      await expect(component.getByTestId('status')).toHaveText('fresh');
      await expect(component.getByTestId('data')).toHaveText('v1');
    });

    test('re-arms auto-refresh after store.reset() while component is mounted', async ({
      mount,
    }) => {
      const component = await mount(<AutoRefreshHarness />);
      // Wait for initial fetch to settle.
      await expect(component.getByTestId('status')).toHaveText('fresh');
      await expect(component.getByTestId('data')).toHaveText('v1');

      // Reset snapshot to idle — fetchCount also resets to 0.
      await component.getByRole('button', { name: 'Reset' }).click();

      // Hook detects idle and re-arms: fetch fires again → 'v1' (counter starts from 0).
      await expect(component.getByTestId('status')).toHaveText('fresh');
      await expect(component.getByTestId('data')).toHaveText('v1');
    });
  });

  test.describe('ref-counted multi-subscriber', () => {
    test('both subscribers see the same fresh data after mount', async ({ mount }) => {
      const component = await mount(<MultiSubscriberHarness />);
      await expect(component.getByTestId('status-a')).toHaveText('fresh');
      await expect(component.getByTestId('status-b')).toHaveText('fresh');
      // Both must show identical data — they share one Cached instance.
      const dataA = await component.getByTestId('data-a').textContent();
      const dataB = await component.getByTestId('data-b').textContent();
      expect(dataA).toBe(dataB);
    });

    test('remaining subscriber stays fresh after second unmounts', async ({ mount }) => {
      const component = await mount(<MultiSubscriberHarness />);
      await expect(component.getByTestId('status-a')).toHaveText('fresh');

      // Unmount subscriber B — ref count drops to 1, auto-refresh must keep running.
      await component.getByRole('button', { name: 'Toggle B' }).click();
      await expect(component.getByTestId('status-a')).toHaveText('fresh');
    });
  });

  test.describe('selector', () => {
    test('applies selector to CachedState and returns transformed value', async ({ mount }) => {
      const component = await mount(<SelectorHarness />);
      // onExpire returns 'hello'; selector uppercases it.
      await expect(component.getByTestId('upper')).toHaveText('HELLO');
    });
  });
});
