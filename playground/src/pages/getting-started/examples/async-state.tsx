import {
  asyncFulfilled,
  asyncIdle,
  asyncPending,
  asyncRejected,
  connectDebugLog,
  createStore,
  type AsyncState,
} from '@stardust/core';
import { useStore } from '@stardust/react';
import { Button, CircularProgress, Typography } from '@mui/material';
import { ExampleLayout } from '@/entities/example';

type User = { name: string; email: string };

const fetchUser = (id: number) =>
  new Promise<User>((resolve) =>
    setTimeout(() => {
      resolve({ name: `User ${String(id)}`, email: `user${String(id)}@example.com` });
    }, 800)
  );

const initialUserState: { userId: number; asyncUser: AsyncState<User> } = {
  userId: 1,
  asyncUser: asyncIdle,
};

const userStore = createStore(initialUserState, ({ set, get }) => ({
  async loadUser() {
    const id = get().userId;
    set({ ...get(), asyncUser: asyncPending });
    try {
      const user = await fetchUser(id);
      set({ userId: id + 1, asyncUser: asyncFulfilled(user) });
    } catch (err) {
      set({
        ...get(),
        asyncUser: asyncRejected(err instanceof Error ? err : new Error(String(err))),
      });
    }
  },
  reset() {
    set({ userId: 1, asyncUser: asyncIdle });
  },
  
}));

connectDebugLog(userStore, { name: 'user' });

export function AsyncStateExample() {
  const { asyncUser } = useStore(userStore);

  const content =
    asyncUser.status === 'pending' ? (
      <CircularProgress size={16} />
    ) : asyncUser.status === 'fulfilled' ? (
      <Typography variant="body2">
        {asyncUser.data.name} — {asyncUser.data.email}
      </Typography>
    ) : asyncUser.status === 'rejected' ? (
      <Typography variant="body2" color="error">
        {asyncUser.error.message}
      </Typography>
    ) : (
      <Typography variant="body2" color="text.disabled">
        idle
      </Typography>
    );

  return (
    <ExampleLayout result={`status: ${asyncUser.status}`}>
      <Button variant="outlined" size="small" onClick={() => userStore.loadUser()}>
        Load Next User
      </Button>
      <Button
        variant="outlined"
        size="small"
        color="error"
        onClick={() => {
          userStore.reset();
        }}
      >
        Reset
      </Button>
      {content}
    </ExampleLayout>
  );
}
