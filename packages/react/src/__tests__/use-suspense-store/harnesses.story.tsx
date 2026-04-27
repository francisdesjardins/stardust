import { Suspense } from 'react';
import { createStore } from '@stardust/core';
import {
  asyncFulfilled,
  asyncIdle,
  asyncPending,
  asyncRejected,
  type AsyncState,
} from '@stardust/core';
import { useSuspenseStore } from '@stardust/react';
import { ErrorBoundary } from './error-boundary.story';

// ── Fulfilled harness ─────────────────────────────────────────────────────────

type UserData = { readonly name: string };
type UserState = { user: AsyncState<UserData> };

const fulfilledInitial: UserState = { user: asyncIdle };
const fulfilledStore = createStore(fulfilledInitial, ({ update }) => ({
  fulfill(name: string): void {
    update((d) => {
      d.user = asyncFulfilled({ name });
    });
  },
  pend(): void {
    update((d) => {
      d.user = asyncPending;
    });
  },
  reset(): void {
    update((d) => {
      d.user = asyncIdle;
    });
  },
}));

function UserName() {
  const user = useSuspenseStore(fulfilledStore, (s) => s.user);
  return <span data-testid="user-name">{user.name}</span>;
}

/**
 * Harness: starts idle (suspended), fulfills on button click.
 */
export function FulfilledHarness() {
  return (
    <div>
      <Suspense fallback={<span data-testid="loading">Loading…</span>}>
        <UserName />
      </Suspense>
      <button
        onClick={() => {
          fulfilledStore.fulfill('Alice');
        }}
      >
        Fulfill
      </button>
      <button
        onClick={() => {
          fulfilledStore.pend();
        }}
      >
        Pend
      </button>
      <button
        onClick={() => {
          fulfilledStore.reset();
        }}
      >
        Reset
      </button>
    </div>
  );
}

// ── Rejected harness ──────────────────────────────────────────────────────────

const rejectedInitial: UserState = { user: asyncIdle };
const rejectedStore = createStore(rejectedInitial, ({ update }) => ({
  reject(message: string): void {
    update((d) => {
      d.user = asyncRejected(new Error(message));
    });
  },
  reset(): void {
    update((d) => {
      d.user = asyncIdle;
    });
  },
}));

function RejectedUserName() {
  const user = useSuspenseStore(rejectedStore, (s) => s.user);
  return <span data-testid="user-name">{user.name}</span>;
}

/**
 * Harness: starts idle (suspended), rejects on button click — caught by ErrorBoundary.
 */
export function RejectedHarness() {
  return (
    <div>
      <ErrorBoundary fallback={<span data-testid="error">Error caught</span>}>
        <Suspense fallback={<span data-testid="loading">Loading…</span>}>
          <RejectedUserName />
        </Suspense>
      </ErrorBoundary>
      <button
        onClick={() => {
          rejectedStore.reject('load failed');
        }}
      >
        Reject
      </button>
      <button
        onClick={() => {
          rejectedStore.reset();
        }}
      >
        Reset
      </button>
    </div>
  );
}

// ── Context injection harness ─────────────────────────────────────────────────

type GreeterApi = { readonly greeting: string };

const contextInitial: UserState = { user: asyncIdle };
const contextStore = createStore<UserState, { fulfill(): void; reset(): void }, GreeterApi>(
  contextInitial,
  ({ update, getContext }) => ({
    fulfill(): void {
      update((d) => {
        d.user = asyncFulfilled({ name: getContext().greeting });
      });
    },
    reset(): void {
      update((d) => {
        d.user = asyncIdle;
      });
    },
  })
);

const greeterApi: GreeterApi = { greeting: 'Hello from context' };

function ContextUserName() {
  const user = useSuspenseStore(contextStore, (s) => s.user, { context: greeterApi });
  return <span data-testid="user-name">{user.name}</span>;
}

/**
 * Harness: fulfills via a store method that reads context injected by useSuspenseStore.
 */
export function ContextHarness() {
  return (
    <div>
      <Suspense fallback={<span data-testid="loading">Loading…</span>}>
        <ContextUserName />
      </Suspense>
      <button
        onClick={() => {
          contextStore.fulfill();
        }}
      >
        Fulfill
      </button>
      <button
        onClick={() => {
          contextStore.reset();
        }}
      >
        Reset
      </button>
    </div>
  );
}
