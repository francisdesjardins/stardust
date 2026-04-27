import { c as createStoreContext, a as createStore, j as jsxRuntimeExports } from './index-D-lsrfCD.js';
import './index-D2bWAGip.js';

const CounterCtx = createStoreContext(
  () => createStore({ count: 0 }, ({ update }) => ({
    increment() {
      update((d) => {
        d.count += 1;
      });
    },
    decrement() {
      update((d) => {
        d.count -= 1;
      });
    }
  })),
  { name: "Counter" }
);
function CounterInner() {
  const store = CounterCtx.useStoreContext();
  const count = CounterCtx.useSnapshot((s) => s.count);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { "data-testid": "count", children: count }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: store.increment, children: "Increment" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: store.decrement, children: "Decrement" })
  ] });
}
function CounterContextHarness() {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(CounterCtx.Provider, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(CounterInner, {}) });
}

export { CounterContextHarness };
//# sourceMappingURL=counter.story-BwL23qVP.js.map
