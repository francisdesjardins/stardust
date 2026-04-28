import { expect, test } from '@playwright/experimental-ct-react';
import { CounterContextHarness } from './create-store-context/counter.story';
import { PricingContextHarness } from './create-store-context/context-injection.story';
import { DomainResetHarness } from './create-store-context/domain-reset.story';
import { EqualsContextHarness } from './create-store-context/equals.story';
import { CounterWithInitialHarness } from './create-store-context/initial.story';
import { SelectorStoreArgContextHarness } from './create-store-context/selector-store-arg.story';
import { TwoProvidersHarness } from './create-store-context/two-providers.story';

test.describe('createStoreContext', () => {
  // ── Basic counter ───────────────────────────────────────────────────────

  test('renders initial snapshot via useSnapshot selector', async ({ mount }) => {
    const component = await mount(<CounterContextHarness />);
    await expect(component.getByTestId('count')).toHaveText('0');
  });

  test('useStoreContext returns store — method call updates snapshot', async ({ mount }) => {
    const component = await mount(<CounterContextHarness />);
    await component.getByRole('button', { name: 'Increment' }).click();
    await expect(component.getByTestId('count')).toHaveText('1');
  });

  test('decrement updates snapshot', async ({ mount }) => {
    const component = await mount(<CounterContextHarness />);
    await component.getByRole('button', { name: 'Decrement' }).click();
    await expect(component.getByTestId('count')).toHaveText('-1');
  });

  // ── Initial value ───────────────────────────────────────────────────────

  test('factory receives initial prop — store starts with supplied value', async ({ mount }) => {
    const component = await mount(<CounterWithInitialHarness />);
    await expect(component.getByTestId('count')).toHaveText('10');
  });

  test('increment from initial value', async ({ mount }) => {
    const component = await mount(<CounterWithInitialHarness />);
    await component.getByRole('button', { name: 'Increment' }).click();
    await expect(component.getByTestId('count')).toHaveText('11');
  });

  // ── Context injection ───────────────────────────────────────────────────

  test('context prop is injected — store method reads taxRate', async ({ mount }) => {
    // basePrice=100, taxRate=0.15 → total = 100 * 1.15 = 115
    const component = await mount(<PricingContextHarness />);
    await expect(component.getByTestId('base')).toHaveText('100');
    await expect(component.getByTestId('total')).toHaveText('115');
  });

  // ── Two independent Provider mounts ────────────────────────────────────

  test('two Provider mounts have isolated store instances', async ({ mount }) => {
    const component = await mount(<TwoProvidersHarness />);
    await expect(component.getByTestId('count-a')).toHaveText('0');
    await expect(component.getByTestId('count-b')).toHaveText('0');
    await component.getByTestId('inc-a').click();
    await expect(component.getByTestId('count-a')).toHaveText('1');
    await expect(component.getByTestId('count-b')).toHaveText('0');
  });

  // ── Domain reset does not clobber initial value (StrictMode regression) ──

  test('user-defined reset domain method does not fire on mount — initial value preserved', async ({
    mount,
  }) => {
    // Regression: the old default onUnmount called store.reset() which resolved to the
    // user's domain reset() (count → 0) during StrictMode's onUnmount pass between
    // double-mount cycles. Default onUnmount is now null so this should stay at 10.
    const component = await mount(<DomainResetHarness />);
    await expect(component.getByTestId('count')).toHaveText('10');
  });

  test('user-defined reset domain method still callable via button', async ({ mount }) => {
    const component = await mount(<DomainResetHarness />);
    await component.getByRole('button', { name: 'Reset' }).click();
    await expect(component.getByTestId('count')).toHaveText('0');
  });

  // ── useSnapshot with store arg ──────────────────────────────────────────

  test('useSnapshot selector accesses domain method via store second argument', async ({
    mount,
  }) => {
    const component = await mount(<SelectorStoreArgContextHarness />);
    // basePrice=100, multiplier=1.2 → total=120
    await expect(component.getByTestId('total')).toHaveText('120');
  });

  test('useSnapshot re-runs domain method when state changes', async ({ mount }) => {
    const component = await mount(<SelectorStoreArgContextHarness />);
    await component.getByRole('button', { name: 'Set 200' }).click();
    // basePrice=200, multiplier=1.2 → total=240
    await expect(component.getByTestId('total')).toHaveText('240');
  });

  // ── useSnapshot with equals ─────────────────────────────────────────────

  test('useSnapshot with shallowEqual suppresses re-render for unrelated field change', async ({
    mount,
  }) => {
    const component = await mount(<EqualsContextHarness />);
    const before = await component.getByTestId('renders').textContent();
    await component.getByRole('button', { name: 'Nudge label' }).click();
    // label changed but x/y unchanged — shallowEqual suppresses re-render
    await expect(component.getByTestId('renders')).toHaveText(before ?? '');
  });
});
