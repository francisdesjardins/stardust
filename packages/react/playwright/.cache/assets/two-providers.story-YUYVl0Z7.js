import { c as createStoreContext, a as createStore, j as jsxRuntimeExports } from './index-D-lsrfCD.js';
import './index-D2bWAGip.js';

const CounterCtx = createStoreContext(
  () => createStore({ count: 0 }, ({ update }) => ({
    increment() {
      update((d) => {
        d.count += 1;
      });
    }
  })),
  { name: "TwoProviders" }
);
function CounterLabel({ label }) {
  const store = CounterCtx.useStoreContext();
  const count = CounterCtx.useSnapshot((s) => s.count);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { "data-testid": `count-${label}`, children: count }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("button", { "data-testid": `inc-${label}`, onClick: store.increment, children: "+" })
  ] });
}
function TwoProvidersHarness() {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(CounterCtx.Provider, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(CounterLabel, { label: "a" }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(CounterCtx.Provider, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(CounterLabel, { label: "b" }) })
  ] });
}

export { TwoProvidersHarness };
//# sourceMappingURL=two-providers.story-YUYVl0Z7.js.map
