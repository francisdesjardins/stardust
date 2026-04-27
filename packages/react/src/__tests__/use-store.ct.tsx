import { expect, test } from '@playwright/experimental-ct-react';
import {
  EqualsHarness,
  FullSnapshotHarness,
  MultiSliceHarness,
  ProduceHarness,
  SelectorHarness,
} from './use-store.story';

test.describe('useStore — equals option', () => {
  test('store update to unrelated field is visible via full snapshot but slice values are unchanged', async ({
    mount,
  }) => {
    const component = await mount(<EqualsHarness />);
    await expect(component.getByTestId('unrelated')).toHaveText('a');
    await expect(component.getByTestId('x')).toHaveText('0');

    // Store changes — full snapshot subscription shows the update
    await component.getByRole('button', { name: 'Change Unrelated' }).click();
    await expect(component.getByTestId('unrelated')).toHaveText('changed');

    // Slice values are unaffected — shallowEqual correctly identifies no change in { x, y }
    await expect(component.getByTestId('x')).toHaveText('0');
    await expect(component.getByTestId('y')).toHaveText('0');
  });

  test('slice updates when a selected field changes', async ({ mount }) => {
    const component = await mount(<EqualsHarness />);
    await component.getByRole('button', { name: 'Increment X' }).click();
    await expect(component.getByTestId('x')).toHaveText('1');
    await expect(component.getByTestId('y')).toHaveText('0');
  });
});

test.describe('useStore', () => {
  test.describe('full snapshot', () => {
    test('displays initial state', async ({ mount }) => {
      const component = await mount(<FullSnapshotHarness />);
      await expect(component.getByTestId('count')).toHaveText('0');
    });

    test('updates on store mutation', async ({ mount }) => {
      const component = await mount(<FullSnapshotHarness />);
      await component.getByRole('button', { name: 'Increment' }).click();
      await expect(component.getByTestId('count')).toHaveText('1');
    });

    test('resets to initial state', async ({ mount }) => {
      const component = await mount(<FullSnapshotHarness />);
      await component.getByRole('button', { name: 'Increment' }).click();
      await component.getByRole('button', { name: 'Increment' }).click();
      await component.getByRole('button', { name: 'Reset' }).click();
      await expect(component.getByTestId('count')).toHaveText('0');
    });
  });

  test.describe('selector', () => {
    test('displays selected slice', async ({ mount }) => {
      const component = await mount(<SelectorHarness />);
      await expect(component.getByTestId('count')).toHaveText('0');
    });

    test('updates when selected slice changes', async ({ mount }) => {
      const component = await mount(<SelectorHarness />);
      await component.getByRole('button', { name: 'Increment' }).click();
      await expect(component.getByTestId('count')).toHaveText('1');
      await component.getByRole('button', { name: 'Increment' }).click();
      await expect(component.getByTestId('count')).toHaveText('2');
    });
  });

  test.describe('multi-slice', () => {
    test('displays initial values from multiple selectors', async ({ mount }) => {
      const component = await mount(<MultiSliceHarness />);
      await expect(component.getByTestId('name')).toHaveText('');
      await expect(component.getByTestId('submitted')).toHaveText('false');
    });

    test('name selector updates when name changes', async ({ mount }) => {
      const component = await mount(<MultiSliceHarness />);
      await component.getByRole('button', { name: 'Set Name' }).click();
      await expect(component.getByTestId('name')).toHaveText('Alice');
      await expect(component.getByTestId('submitted')).toHaveText('false');
    });

    test('submitted selector updates independently', async ({ mount }) => {
      const component = await mount(<MultiSliceHarness />);
      await component.getByRole('button', { name: 'Submit' }).click();
      await expect(component.getByTestId('submitted')).toHaveText('true');
    });

    test('reset restores all slices', async ({ mount }) => {
      const component = await mount(<MultiSliceHarness />);
      await component.getByRole('button', { name: 'Set Name' }).click();
      await component.getByRole('button', { name: 'Submit' }).click();
      await component.getByRole('button', { name: 'Reset' }).click();
      await expect(component.getByTestId('name')).toHaveText('');
      await expect(component.getByTestId('submitted')).toHaveText('false');
    });
  });

  test.describe('produce integration', () => {
    test('draft-based mutations update the store', async ({ mount }) => {
      const component = await mount(<ProduceHarness />);
      await component.getByRole('button', { name: 'Set Name Bob' }).click();
      await expect(component.getByTestId('name')).toHaveText('Bob');
      await expect(component.getByTestId('email')).toHaveText('');
    });

    test('multiple draft mutations accumulate', async ({ mount }) => {
      const component = await mount(<ProduceHarness />);
      await component.getByRole('button', { name: 'Set Name Bob' }).click();
      await component.getByRole('button', { name: 'Set Email Bob' }).click();
      await component.getByRole('button', { name: 'Submit' }).click();
      await expect(component.getByTestId('name')).toHaveText('Bob');
      await expect(component.getByTestId('email')).toHaveText('bob@test.com');
      await expect(component.getByTestId('submitted')).toHaveText('true');
    });

    test('reset clears all produce-set values', async ({ mount }) => {
      const component = await mount(<ProduceHarness />);
      await component.getByRole('button', { name: 'Set Name Bob' }).click();
      await component.getByRole('button', { name: 'Set Email Bob' }).click();
      await component.getByRole('button', { name: 'Reset' }).click();
      await expect(component.getByTestId('name')).toHaveText('');
      await expect(component.getByTestId('email')).toHaveText('');
      await expect(component.getByTestId('submitted')).toHaveText('false');
    });
  });
});
