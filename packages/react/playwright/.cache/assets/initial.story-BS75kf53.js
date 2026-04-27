import { c as createStoreContext, a as createStore, j as jsxRuntimeExports } from './index-CHDL1A9q.js';
import './index-C2HjpCzT.js';

const InitialCounterCtx = createStoreContext(
  (initial) => createStore(initial, ({ update }) => ({
    increment() {
      update((d) => {
        d.count += 1;
      });
    }
  })),
  { name: "InitialCounter" }
);
function InitialCounterInner() {
  const store = InitialCounterCtx.useStoreContext();
  const count = InitialCounterCtx.useSnapshot((s) => s.count);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { "data-testid": "count", children: count }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: store.increment, children: "Increment" })
  ] });
}
function CounterWithInitialHarness() {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(InitialCounterCtx.Provider, { initial: { count: 10 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(InitialCounterInner, {}) });
}

export { CounterWithInitialHarness };
//# sourceMappingURL=initial.story-BS75kf53.js.map
