import { expect, test } from '@playwright/experimental-ct-react';
import {
  DerivedEqualityHarness,
  DerivedMultiHarness,
  DerivedSingleHarness,
} from './use-store.story';

test.describe('useStore + createDerivedStore', () => {
  test.describe('single source', () => {
    test('displays initial derived value', async ({ mount }) => {
      const component = await mount(<DerivedSingleHarness />);
      await expect(component.getByTestId('count')).toHaveText('0');
      await expect(component.getByTestId('doubled')).toHaveText('0');
    });

    test('updates derived value on source change', async ({ mount }) => {
      const component = await mount(<DerivedSingleHarness />);
      await component.getByRole('button', { name: 'Increment' }).click();
      await expect(component.getByTestId('count')).toHaveText('1');
      await expect(component.getByTestId('doubled')).toHaveText('2');
    });

    test('updates after multiple mutations', async ({ mount }) => {
      const component = await mount(<DerivedSingleHarness />);
      await component.getByRole('button', { name: 'Increment' }).click();
      await component.getByRole('button', { name: 'Increment' }).click();
      await component.getByRole('button', { name: 'Increment' }).click();
      await expect(component.getByTestId('doubled')).toHaveText('6');
    });

    test('resets correctly', async ({ mount }) => {
      const component = await mount(<DerivedSingleHarness />);
      await component.getByRole('button', { name: 'Increment' }).click();
      await component.getByRole('button', { name: 'Increment' }).click();
      await component.getByRole('button', { name: 'Reset' }).click();
      await expect(component.getByTestId('count')).toHaveText('0');
      await expect(component.getByTestId('doubled')).toHaveText('0');
    });
  });

  test.describe('multi source', () => {
    test('displays initial combined value', async ({ mount }) => {
      const component = await mount(<DerivedMultiHarness />);
      await expect(component.getByTestId('summary')).toHaveText('hello:0');
    });

    test('updates when first source changes', async ({ mount }) => {
      const component = await mount(<DerivedMultiHarness />);
      await component.getByRole('button', { name: 'Increment' }).click();
      await expect(component.getByTestId('summary')).toHaveText('hello:1');
    });

    test('updates when second source changes', async ({ mount }) => {
      const component = await mount(<DerivedMultiHarness />);
      await component.getByRole('button', { name: 'Set Label' }).click();
      await expect(component.getByTestId('summary')).toHaveText('world:0');
    });

    test('updates when both sources change', async ({ mount }) => {
      const component = await mount(<DerivedMultiHarness />);
      await component.getByRole('button', { name: 'Increment' }).click();
      await component.getByRole('button', { name: 'Set Label' }).click();
      await expect(component.getByTestId('summary')).toHaveText('world:1');
    });
  });

  test.describe('shallowEqual suppression (explicit)', () => {
    test('changing unrelated source does not update derived value', async ({ mount }) => {
      const component = await mount(<DerivedEqualityHarness />);
      await expect(component.getByTestId('doubled')).toHaveText('0');

      // Change label — derived only reads count, so shallowEqual suppresses
      await component.getByRole('button', { name: 'Change Label Only' }).click();
      await expect(component.getByTestId('doubled')).toHaveText('0');
    });

    test('changing relevant source updates derived value', async ({ mount }) => {
      const component = await mount(<DerivedEqualityHarness />);
      await component.getByRole('button', { name: 'Increment Counter' }).click();
      await expect(component.getByTestId('doubled')).toHaveText('2');
    });
  });
});
