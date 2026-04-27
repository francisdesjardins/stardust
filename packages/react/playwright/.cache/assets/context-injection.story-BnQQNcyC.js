import {
  c as createStoreContext,
  a as createStore,
  j as jsxRuntimeExports,
} from './index-CHDL1A9q.js';
import './index-C2HjpCzT.js';

const PricingContext = createStoreContext(
  () =>
    createStore({ basePrice: 100 }, ({ get, getContext }) => ({
      getTotal() {
        return get().basePrice * (1 + getContext().taxRate);
      },
    })),
  { name: 'Pricing' }
);
function PricingInner() {
  const store = PricingContext.useStoreContext();
  const { basePrice } = PricingContext.useSnapshot();
  return /* @__PURE__ */ jsxRuntimeExports.jsxs('div', {
    children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx('span', { 'data-testid': 'base', children: basePrice }),
      /* @__PURE__ */ jsxRuntimeExports.jsx('span', {
        'data-testid': 'total',
        children: Math.round(store.getTotal()),
      }),
    ],
  });
}
function PricingContextHarness() {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(PricingContext.Provider, {
    context: { taxRate: 0.15 },
    children: /* @__PURE__ */ jsxRuntimeExports.jsx(PricingInner, {}),
  });
}

export { PricingContextHarness };
//# sourceMappingURL=context-injection.story-BnQQNcyC.js.map
