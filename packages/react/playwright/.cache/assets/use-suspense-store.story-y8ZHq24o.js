import {
  d as asyncIdle,
  a as createStore,
  e as asyncPending,
  f as asyncFulfilled,
  g as useSuspenseStore,
  j as jsxRuntimeExports,
  h as asyncRejected,
} from './index-CHDL1A9q.js';
import { r as reactExports } from './index-C2HjpCzT.js';

class ErrorBoundary extends reactExports.Component {
  constructor(props) {
    super(props);
    this.state = { error: void 0 };
  }
  static getDerivedStateFromError(error) {
    return { error: error instanceof Error ? error : new Error(String(error)) };
  }
  render() {
    const { error } = this.state;
    if (error !== void 0) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

const fulfilledInitial = { user: asyncIdle };
const fulfilledStore = createStore(fulfilledInitial, ({ update }) => ({
  fulfill(name) {
    update((d) => {
      d.user = asyncFulfilled({ name });
    });
  },
  pend() {
    update((d) => {
      d.user = asyncPending;
    });
  },
  reset() {
    update((d) => {
      d.user = asyncIdle;
    });
  },
}));
function UserName() {
  const user = useSuspenseStore(fulfilledStore, (s) => s.user);
  return /* @__PURE__ */ jsxRuntimeExports.jsx('span', {
    'data-testid': 'user-name',
    children: user.name,
  });
}
function FulfilledHarness() {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs('div', {
    children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(reactExports.Suspense, {
        fallback: /* @__PURE__ */ jsxRuntimeExports.jsx('span', {
          'data-testid': 'loading',
          children: 'Loading…',
        }),
        children: /* @__PURE__ */ jsxRuntimeExports.jsx(UserName, {}),
      }),
      /* @__PURE__ */ jsxRuntimeExports.jsx('button', {
        onClick: () => {
          fulfilledStore.fulfill('Alice');
        },
        children: 'Fulfill',
      }),
      /* @__PURE__ */ jsxRuntimeExports.jsx('button', {
        onClick: () => {
          fulfilledStore.pend();
        },
        children: 'Pend',
      }),
      /* @__PURE__ */ jsxRuntimeExports.jsx('button', {
        onClick: () => {
          fulfilledStore.reset();
        },
        children: 'Reset',
      }),
    ],
  });
}
const rejectedInitial = { user: asyncIdle };
const rejectedStore = createStore(rejectedInitial, ({ update }) => ({
  reject(message) {
    update((d) => {
      d.user = asyncRejected(new Error(message));
    });
  },
  reset() {
    update((d) => {
      d.user = asyncIdle;
    });
  },
}));
function RejectedUserName() {
  const user = useSuspenseStore(rejectedStore, (s) => s.user);
  return /* @__PURE__ */ jsxRuntimeExports.jsx('span', {
    'data-testid': 'user-name',
    children: user.name,
  });
}
function RejectedHarness() {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs('div', {
    children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(ErrorBoundary, {
        fallback: /* @__PURE__ */ jsxRuntimeExports.jsx('span', {
          'data-testid': 'error',
          children: 'Error caught',
        }),
        children: /* @__PURE__ */ jsxRuntimeExports.jsx(reactExports.Suspense, {
          fallback: /* @__PURE__ */ jsxRuntimeExports.jsx('span', {
            'data-testid': 'loading',
            children: 'Loading…',
          }),
          children: /* @__PURE__ */ jsxRuntimeExports.jsx(RejectedUserName, {}),
        }),
      }),
      /* @__PURE__ */ jsxRuntimeExports.jsx('button', {
        onClick: () => {
          rejectedStore.reject('load failed');
        },
        children: 'Reject',
      }),
      /* @__PURE__ */ jsxRuntimeExports.jsx('button', {
        onClick: () => {
          rejectedStore.reset();
        },
        children: 'Reset',
      }),
    ],
  });
}
const contextInitial = { user: asyncIdle };
const contextStore = createStore(contextInitial, ({ update, getContext }) => ({
  fulfill() {
    update((d) => {
      d.user = asyncFulfilled({ name: getContext().greeting });
    });
  },
  reset() {
    update((d) => {
      d.user = asyncIdle;
    });
  },
}));
const greeterApi = { greeting: 'Hello from context' };
function ContextUserName() {
  const user = useSuspenseStore(contextStore, (s) => s.user, { context: greeterApi });
  return /* @__PURE__ */ jsxRuntimeExports.jsx('span', {
    'data-testid': 'user-name',
    children: user.name,
  });
}
function ContextHarness() {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs('div', {
    children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(reactExports.Suspense, {
        fallback: /* @__PURE__ */ jsxRuntimeExports.jsx('span', {
          'data-testid': 'loading',
          children: 'Loading…',
        }),
        children: /* @__PURE__ */ jsxRuntimeExports.jsx(ContextUserName, {}),
      }),
      /* @__PURE__ */ jsxRuntimeExports.jsx('button', {
        onClick: () => {
          contextStore.fulfill();
        },
        children: 'Fulfill',
      }),
      /* @__PURE__ */ jsxRuntimeExports.jsx('button', {
        onClick: () => {
          contextStore.reset();
        },
        children: 'Reset',
      }),
    ],
  });
}

export { ContextHarness, FulfilledHarness, RejectedHarness };
//# sourceMappingURL=use-suspense-store.story-y8ZHq24o.js.map
