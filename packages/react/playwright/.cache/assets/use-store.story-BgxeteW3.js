import { a as createStore, b as createDerivedStore, s as shallowEqual, u as useStore, j as jsxRuntimeExports } from './index-CHDL1A9q.js';
import { r as reactExports } from './index-C2HjpCzT.js';

const counterStore$3 = createStore({ count: 0 }, ({ update }) => ({
  increment() {
    update((d) => {
      d.count += 1;
    });
  }
}));
const labelStore$1 = createStore({ label: "x" }, ({ update }) => ({
  setLabel(v) {
    update((d) => {
      d.label = v;
    });
  }
}));
const countOnlyDerived = createDerivedStore(
  [counterStore$3, labelStore$1],
  (c, _l) => ({
    doubled: c.count * 2
  }),
  { equals: shallowEqual }
);
function DerivedEqualityHarness() {
  const { doubled } = useStore(countOnlyDerived);
  const [renderCount, setRenderCount] = reactExports.useState(0);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    RenderTracker$1,
    {
      doubled,
      renderCount,
      onRender: () => {
        setRenderCount((c) => c + 1);
      }
    }
  );
}
function RenderTracker$1({
  doubled,
  renderCount,
  onRender
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { "data-testid": "doubled", children: doubled }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { "data-testid": "render-count", children: renderCount }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "button",
      {
        onClick: () => {
          labelStore$1.setLabel(`label-${String(Date.now())}`);
        },
        children: "Change Label Only"
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "button",
      {
        onClick: () => {
          counterStore$3.increment();
        },
        children: "Increment Counter"
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: onRender, children: "Track Render" })
  ] });
}

const countStore = createStore({ count: 0 }, ({ update }) => ({
  increment() {
    update((d) => {
      d.count += 1;
    });
  }
}));
const labelStore = createStore({ label: "hello" }, ({ update }) => ({
  setLabel(v) {
    update((d) => {
      d.label = v;
    });
  }
}));
const summaryStore = createDerivedStore(
  [countStore, labelStore],
  (c, l) => ({ text: `${l.label}:${String(c.count)}` }),
  { equals: shallowEqual }
);
function DerivedMultiHarness() {
  const { text } = useStore(summaryStore);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { "data-testid": "summary", children: text }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "button",
      {
        onClick: () => {
          countStore.increment();
        },
        children: "Increment"
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "button",
      {
        onClick: () => {
          labelStore.setLabel("world");
        },
        children: "Set Label"
      }
    )
  ] });
}

const counterStore$2 = createStore({ count: 0 }, ({ update }) => ({
  increment() {
    update((d) => {
      d.count += 1;
    });
  },
  reset() {
    update((d) => {
      d.count = 0;
    });
  }
}));
const doubledStore = createDerivedStore([counterStore$2], (c) => ({ doubled: c.count * 2 }), {
  equals: shallowEqual
});
function DerivedSingleHarness() {
  const { doubled } = useStore(doubledStore);
  const { count } = useStore(counterStore$2);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { "data-testid": "count", children: count }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { "data-testid": "doubled", children: doubled }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "button",
      {
        onClick: () => {
          counterStore$2.increment();
        },
        children: "Increment"
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "button",
      {
        onClick: () => {
          counterStore$2.reset();
        },
        children: "Reset"
      }
    )
  ] });
}

const counterStore$1 = createStore({ count: 0 }, ({ set, update }) => ({
  increment() {
    update((draft) => {
      draft.count += 1;
    });
  },
  reset() {
    set({ count: 0 });
  }
}));
function FullSnapshotHarness() {
  const snap = useStore(counterStore$1);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { "data-testid": "count", children: snap.count }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "button",
      {
        onClick: () => {
          counterStore$1.increment();
        },
        children: "Increment"
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "button",
      {
        onClick: () => {
          counterStore$1.reset();
        },
        children: "Reset"
      }
    )
  ] });
}

const formStore$1 = createStore(
  { name: "", email: "", submitted: false },
  ({ set, update }) => ({
    setField(key, value) {
      update((draft) => {
        draft[key] = value;
      });
    },
    submit() {
      update((draft) => {
        draft.submitted = true;
      });
    },
    reset() {
      set({ name: "", email: "", submitted: false });
    }
  })
);
function MultiSliceHarness() {
  const name = useStore(formStore$1, (s) => s.name);
  const submitted = useStore(formStore$1, (s) => s.submitted);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { "data-testid": "name", children: name }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { "data-testid": "submitted", children: String(submitted) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "button",
      {
        onClick: () => {
          formStore$1.setField("name", "Alice");
        },
        children: "Set Name"
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "button",
      {
        onClick: () => {
          formStore$1.setField("email", "alice@test.com");
        },
        children: "Set Email"
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "button",
      {
        onClick: () => {
          formStore$1.submit();
        },
        children: "Submit"
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "button",
      {
        onClick: () => {
          formStore$1.reset();
        },
        children: "Reset"
      }
    )
  ] });
}

const formStore = createStore(
  { name: "", email: "", submitted: false },
  ({ set, update }) => ({
    setField(key, value) {
      update((draft) => {
        draft[key] = value;
      });
    },
    submit() {
      update((draft) => {
        draft.submitted = true;
      });
    },
    reset() {
      set({ name: "", email: "", submitted: false });
    }
  })
);
function ProduceHarness() {
  const snap = useStore(formStore);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { "data-testid": "name", children: snap.name }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { "data-testid": "email", children: snap.email }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { "data-testid": "submitted", children: String(snap.submitted) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "button",
      {
        onClick: () => {
          formStore.setField("name", "Bob");
        },
        children: "Set Name Bob"
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "button",
      {
        onClick: () => {
          formStore.setField("email", "bob@test.com");
        },
        children: "Set Email Bob"
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "button",
      {
        onClick: () => {
          formStore.submit();
        },
        children: "Submit"
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "button",
      {
        onClick: () => {
          formStore.reset();
        },
        children: "Reset"
      }
    )
  ] });
}

const counterStore = createStore({ count: 0 }, ({ set, update }) => ({
  increment() {
    update((draft) => {
      draft.count += 1;
    });
  },
  reset() {
    set({ count: 0 });
  }
}));
function SelectorHarness() {
  const count = useStore(counterStore, (s) => s.count);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { "data-testid": "count", children: count }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "button",
      {
        onClick: () => {
          counterStore.increment();
        },
        children: "Increment"
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "button",
      {
        onClick: () => {
          counterStore.reset();
        },
        children: "Reset"
      }
    )
  ] });
}

function makeStore() {
  return createStore(
    { x: 0, y: 0, unrelated: "a" },
    ({ setByPath }) => ({
      setX(n) {
        setByPath("x", n);
      },
      setUnrelated(s) {
        setByPath("unrelated", s);
      }
    })
  );
}
const equalsStore = makeStore();
const equalsRenderTrackStore = makeStore();
function EqualsHarness() {
  const slice = useStore(equalsStore, {
    select: (s) => ({ x: s.x, y: s.y }),
    equals: shallowEqual
  });
  const { unrelated } = useStore(equalsStore);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { "data-testid": "x", children: slice.x }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { "data-testid": "y", children: slice.y }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { "data-testid": "unrelated", children: unrelated }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "button",
      {
        onClick: () => {
          equalsStore.setX(slice.x + 1);
        },
        children: "Increment X"
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "button",
      {
        onClick: () => {
          equalsStore.setUnrelated("changed");
        },
        children: "Change Unrelated"
      }
    )
  ] });
}
function EqualsRenderTrackHarness() {
  const slice = useStore(equalsRenderTrackStore, {
    select: (s) => ({ x: s.x, y: s.y }),
    equals: shallowEqual
  });
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    RenderTracker,
    {
      x: slice.x,
      onIncrementX: () => {
        equalsRenderTrackStore.setX(slice.x + 1);
      },
      onChangeUnrelated: () => {
        equalsRenderTrackStore.setUnrelated("changed");
      }
    }
  );
}
function RenderTracker({
  x,
  onIncrementX,
  onChangeUnrelated
}) {
  const [renderCount, setRenderCount] = reactExports.useState(0);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { "data-testid": "x", children: x }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { "data-testid": "render-count", children: renderCount }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: onIncrementX, children: "Increment X" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: onChangeUnrelated, children: "Change Unrelated" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "button",
      {
        onClick: () => {
          setRenderCount((c) => c + 1);
        },
        children: "Track Render"
      }
    )
  ] });
}

export { DerivedEqualityHarness, DerivedMultiHarness, DerivedSingleHarness, EqualsHarness, EqualsRenderTrackHarness, FullSnapshotHarness, MultiSliceHarness, ProduceHarness, SelectorHarness };
//# sourceMappingURL=use-store.story-BgxeteW3.js.map
