import { asyncIdle, createStore, runAsync, type AsyncState } from '@stardust/core';
import { useStore } from '@stardust/react';
import { Button, Stack, Typography } from '@mui/material';
import { ExampleLayout } from '@/entities/example';

// ── Types ─────────────────────────────────────────────────────────────────────

type Profile = { name: string; role: string };

// ── Fake fetch ────────────────────────────────────────────────────────────────

const fakeLoad = (shouldFail: boolean): Promise<Profile> =>
  new Promise((resolve, reject) =>
    setTimeout(() => {
      if (shouldFail) {
        reject(new Error('Network error — try again'));
      } else {
        resolve({ name: 'Alice', role: 'Engineer' });
      }
    }, 700)
  );

// ── Store ─────────────────────────────────────────────────────────────────────

const initial: { profile: AsyncState<Profile> } = { profile: asyncIdle };

const profileStore = createStore(initial, ({ update }) => ({
  actions: {
    load(shouldFail = false) {
      void runAsync(
        () => fakeLoad(shouldFail),
        (state) => {
          update((d) => {
            d.profile = state;
          });
        }
      );
    },
  },
}));

// ── Component ─────────────────────────────────────────────────────────────────

function statusLabel(state: AsyncState<Profile>): string {
  if (state.status === 'fulfilled') return `${state.data.name} · ${state.data.role}`;
  if (state.status === 'rejected') return state.error.message;
  return state.status;
}

export function RunAsyncExample() {
  const { profile } = useStore(profileStore);

  return (
    <ExampleLayout result={statusLabel(profile)}>
      <Stack direction="row" sx={{ gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
        <Button
          variant="outlined"
          size="small"
          disabled={profile.status === 'pending'}
          onClick={() => {
            profileStore.actions.load(false);
          }}
        >
          Load
        </Button>
        <Button
          variant="outlined"
          size="small"
          color="error"
          disabled={profile.status === 'pending'}
          onClick={() => {
            profileStore.actions.load(true);
          }}
        >
          Load (fail)
        </Button>
        <Button
          variant="outlined"
          size="small"
          disabled={profile.status === 'idle'}
          onClick={() => {
            profileStore.reset();
          }}
        >
          Reset
        </Button>
      </Stack>

      {/* Four-state progress display */}
      <Stack direction="row" sx={{ gap: 2, flexWrap: 'wrap' }}>
        {(
          [
            { status: 'idle', label: 'idle', color: 'text.disabled' },
            { status: 'pending', label: 'pending…', color: 'info.main' },
            { status: 'fulfilled', label: 'fulfilled', color: 'success.main' },
            { status: 'rejected', label: 'rejected', color: 'error.main' },
          ] as const
        ).map(({ status, label, color }) => (
          <Typography
            key={status}
            variant="caption"
            sx={{
              fontFamily: 'monospace',
              fontWeight: profile.status === status ? 'bold' : 'normal',
              color: profile.status === status ? color : 'text.disabled',
            }}
          >
            {label}
          </Typography>
        ))}
      </Stack>
    </ExampleLayout>
  );
}
