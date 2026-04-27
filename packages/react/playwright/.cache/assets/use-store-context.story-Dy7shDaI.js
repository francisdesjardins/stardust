import { a as createStore, u as useStore, j as jsxRuntimeExports } from './index-D-lsrfCD.js';
import './index-D2bWAGip.js';

function makePricingStore() {
  return createStore(
    { basePrice: 100 },
    ({ get, getContext }) => ({
      getTotal() {
        return get().basePrice * (1 + getContext().taxRate);
      }
    })
  );
}
const contextStore = makePricingStore();
const selectorContextStore = makePricingStore();
function ContextHarness() {
  const snap = useStore(contextStore, { context: { taxRate: 1 } });
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { "data-testid": "base", children: snap.basePrice }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { "data-testid": "total", children: contextStore.getTotal() }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "button",
      {
        onClick: () => {
          contextStore.setByPath("basePrice", 200);
        },
        children: "Set 200"
      }
    )
  ] });
}
function ContextWithSelectorHarness() {
  const base = useStore(selectorContextStore, {
    select: (s) => s.basePrice,
    context: { taxRate: 3 }
  });
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { "data-testid": "base", children: base }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { "data-testid": "total", children: selectorContextStore.getTotal() }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "button",
      {
        onClick: () => {
          selectorContextStore.setByPath("basePrice", 50);
        },
        children: "Set 50"
      }
    )
  ] });
}

export { ContextHarness, ContextWithSelectorHarness };
//# sourceMappingURL=use-store-context.story-Dy7shDaI.js.map
