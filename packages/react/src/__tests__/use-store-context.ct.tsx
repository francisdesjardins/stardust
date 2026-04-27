import { expect, test } from '@playwright/experimental-ct-react';
import { ContextHarness, ContextWithSelectorHarness } from './use-store-context.story';

test.describe('useStore — context', () => {
  test.describe('context only (no selector)', () => {
    test('renders initial snapshot with context bound', async ({ mount }) => {
      const component = await mount(<ContextHarness />);
      await expect(component.getByTestId('base')).toHaveText('100');
    });

    test('getTotal() uses the bound context taxRate', async ({ mount }) => {
      const component = await mount(<ContextHarness />);
      // basePrice=100, taxRate=1 → total = 100 * (1 + 1) = 200
      await expect(component.getByTestId('total')).toHaveText('200');
    });

    test('store method re-reads context after state change', async ({ mount }) => {
      const component = await mount(<ContextHarness />);
      await component.getByRole('button', { name: 'Set 200' }).click();
      await expect(component.getByTestId('base')).toHaveText('200');
      // basePrice=200, taxRate=1 → total = 200 * (1 + 1) = 400
      await expect(component.getByTestId('total')).toHaveText('400');
    });
  });

  test.describe('selector + context', () => {
    test('renders selected slice with context bound', async ({ mount }) => {
      const component = await mount(<ContextWithSelectorHarness />);
      await expect(component.getByTestId('base')).toHaveText('100');
    });

    test('getTotal() uses the bound context taxRate', async ({ mount }) => {
      const component = await mount(<ContextWithSelectorHarness />);
      // basePrice=100, taxRate=3 → total = 100 * (1 + 3) = 400
      await expect(component.getByTestId('total')).toHaveText('400');
    });

    test('selector slice updates and context remains bound', async ({ mount }) => {
      const component = await mount(<ContextWithSelectorHarness />);
      await component.getByRole('button', { name: 'Set 50' }).click();
      await expect(component.getByTestId('base')).toHaveText('50');
      // basePrice=50, taxRate=3 → total = 50 * (1 + 3) = 200
      await expect(component.getByTestId('total')).toHaveText('200');
    });
  });
});
