import {
  asyncFulfilled,
  asyncIdle,
  asyncPending,
  connectDebugLog,
  createStore,
  type AsyncState,
} from '@stardust/core';
import { useSuspenseStore, useStore } from '@stardust/react';
import { Button, CircularProgress, Typography } from '@mui/material';
import { Suspense } from 'react';
import { ExampleLayout } from '@/entities/example';

type Profile = { name: string; role: string };

const initialProfile: { data: AsyncState<Profile> } = { data: asyncIdle };

const profileStore = createStore(initialProfile, ({ set }) => ({
  async fetch() {
    set({ data: asyncPending });
    await new Promise((r) => setTimeout(r, 700));
    set({ data: asyncFulfilled({ name: 'Francis', role: 'Engineer' }) });
  },
  reset() {
    set({ data: asyncIdle });
  },
}));

connectDebugLog(profileStore, { name: 'profile' });

function ProfileCard() {
  const profile = useSuspenseStore(profileStore, (s) => s.data);
  return (
    <Typography variant="body2">
      {profile.name} — {profile.role}
    </Typography>
  );
}

export function UseSuspenseStoreExample() {
  const { data } = useStore(profileStore);

  return (
    <ExampleLayout result={data.status}>
      <Button variant="outlined" size="small" onClick={() => profileStore.fetch()}>
        Fetch Profile
      </Button>
      <Button
        variant="outlined"
        size="small"
        color="error"
        onClick={() => {
          profileStore.reset();
        }}
      >
        Reset
      </Button>
      <Suspense fallback={<CircularProgress size={16} />}>
        {data.status === 'fulfilled' && <ProfileCard />}
      </Suspense>
    </ExampleLayout>
  );
}
