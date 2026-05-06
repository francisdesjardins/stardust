import {
  cachedFresh,
  connectDebugLog,
  createCachedSlice,
  createStore,
  getCachedData,
} from '@stardust/core';
import { useStore } from '@stardust/react';
import { Button, Chip, Stack, Typography } from '@mui/material';
import { useState } from 'react';
import { cachedStatusColor, ExampleLayout } from '@/entities/example';

type Profile = { name: string; role: string };

const names = ['Nova', 'Aster', 'Lyra', 'Vega'];

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

const EXPIRES_AFTER = 5_000;

async function fetchNextProfile(prev: Profile | undefined): Promise<Profile> {
  await sleep(700);
  const base = prev ?? { name: 'Nova', role: 'admin' };
  const idx = names.indexOf(base.name);
  return { name: names[(idx + 1) % names.length] ?? base.name, role: base.role };
}

// Only `profile` is a CachedState — the other fields are plain values.
const store = createStore(
  {
    profile: cachedFresh<Profile>({ name: 'Nova', role: 'admin' }),
    posts: 3,
    lastVisit: new Date().toLocaleTimeString(),
  },
  (api) => ({
    actions: {
      profileCache: createCachedSlice(api, 'profile', {
        keepPreviousData: true,
        onExpire: fetchNextProfile,
      }),
    },
  })
);

connectDebugLog(store, { name: 'cache-nested' });

export function CacheNestedExample() {
  const { profile, posts, lastVisit } = useStore(store);
  const profileData = getCachedData(profile);
  const [autoRunning, setAutoRunning] = useState(false);

  function startAuto() {
    setAutoRunning(true);
    store.actions.profileCache.startAutoRefresh({ expiresAfter: EXPIRES_AFTER });
  }

  function stopAuto() {
    setAutoRunning(false);
    store.actions.profileCache.stopAutoRefresh();
  }

  return (
    <ExampleLayout
      result={
        profileData
          ? `${profileData.name} (${profileData.role}) · ${String(posts)} posts · last visit ${lastVisit}`
          : `profile: ${profile.status}`
      }
    >
      <Stack direction="column" sx={{ gap: 1, width: '100%' }}>
        <Stack direction="row" sx={{ gap: 1, alignItems: 'center' }}>
          <Typography variant="body2" sx={{ flexShrink: 0 }}>
            profile status:
          </Typography>
          <Chip label={profile.status} color={cachedStatusColor[profile.status]} size="small" />
        </Stack>

        <Typography variant="body2" color="text.secondary">
          posts: <strong>{posts}</strong> · last visit: <strong>{lastVisit}</strong>
        </Typography>

        <Stack direction="row" sx={{ gap: 1, flexWrap: 'wrap' }}>
          <Button
            variant="outlined"
            size="small"
            onClick={() => void store.actions.profileCache.refresh(fetchNextProfile)}
          >
            Refresh profile
          </Button>
          <Button
            variant="outlined"
            size="small"
            color="warning"
            onClick={() => {
              store.actions.profileCache.expire();
            }}
          >
            Expire now
          </Button>
          <Button variant="outlined" size="small" onClick={startAuto} disabled={autoRunning}>
            Start auto-refresh ({EXPIRES_AFTER / 1_000}s)
          </Button>
          <Button variant="outlined" size="small" onClick={stopAuto} disabled={!autoRunning}>
            Stop auto-refresh
          </Button>
        </Stack>

        <Typography variant="caption" color="text.secondary">
          Only <code>profile</code> is a <code>CachedState&lt;Profile&gt;</code>. The{' '}
          <code>posts</code> and <code>lastVisit</code> fields are plain values — unchanged during a
          profile refresh. With auto-refresh armed, &ldquo;Expire now&rdquo; immediately triggers{' '}
          <code>refreshOnExpire</code> on the next timer tick — no dead expired state.
        </Typography>
      </Stack>
    </ExampleLayout>
  );
}
