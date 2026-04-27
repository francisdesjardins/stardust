import {
  c as createStoreContext,
  a as createStore,
  s as shallowEqual,
  j as jsxRuntimeExports,
} from './index-CHDL1A9q.js';
import { r as reactExports } from './index-C2HjpCzT.js';

const PosCtx = createStoreContext(
  () =>
    createStore({ x: 0, y: 0, label: 'origin' }, ({ update }) => ({
      nudgeLabel() {
        update((d) => {
          d.label = 'nudged';
        });
      },
    })),
  { name: 'Pos' }
);
function PosInner() {
  const store = PosCtx.useStoreContext();
  const pos = PosCtx.useSnapshot((s) => ({ x: s.x, y: s.y }), shallowEqual);
  const countRef = reactExports.useRef(0);
  const spanRef = reactExports.useRef(null);
  reactExports.useLayoutEffect(() => {
    countRef.current += 1;
    if (spanRef.current !== null) {
      spanRef.current.textContent = String(countRef.current);
    }
  });
  return /* @__PURE__ */ jsxRuntimeExports.jsxs('div', {
    children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx('span', { 'data-testid': 'x', children: pos.x }),
      /* @__PURE__ */ jsxRuntimeExports.jsx('span', { 'data-testid': 'renders', ref: spanRef }),
      /* @__PURE__ */ jsxRuntimeExports.jsx('button', {
        onClick: store.nudgeLabel,
        children: 'Nudge label',
      }),
    ],
  });
}
function EqualsContextHarness() {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(PosCtx.Provider, {
    children: /* @__PURE__ */ jsxRuntimeExports.jsx(PosInner, {}),
  });
}

export { EqualsContextHarness };
//# sourceMappingURL=equals.story-Dus6aLnz.js.map
