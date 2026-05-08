import {
  connectDebugLog,
  createStore,
  createCachedSlice,
  cachedIdle,
  getCachedData,
  type CachedState,
} from '@stardust/core';
import { useStoreCachedSlice } from '@stardust/react';
import { Button, Chip, Stack, Typography, CircularProgress } from '@mui/material';
import { ExampleLayout } from '@/entities/example';
import { shallowEqual } from '@stardust/core';

type User = { id: number; name: string; email: string };

const initialSnapshot: {
  data: { cached: CachedState<User>; innerValue1?: string };
  outValue1?: string;
} = {
  data: {
    cached: cachedIdle,
    innerValue1: 'innerValue1',
  },
  outValue1: 'outValue1',
};

const apiStore = createStore(initialSnapshot, (api) => {
  const cached = createCachedSlice(api, 'data.cached', {
    onExpire: async (current) => {
      await new Promise((resolve) => setTimeout(resolve, 500));
      const id = (current?.id ?? 0) + 1;
      return {
        id,
        name: `User ${String(id)}`,
        email: `user${String(id)}@example.com`,
      };
    },
    expiresAfter: 10_000,
  });

  return {
    actions: {
      forceRefresh: async () => {
        await cached.refresh(async (current) => {
          await new Promise((resolve) => setTimeout(resolve, 500));
          const id = (current?.id ?? 0) + 1;
          return { id, name: `User ${String(id)}`, email: `user${String(id)}@example.com` };
        });
      },
      expire: () => {
        api.run('example:expire', () => {
          cached.expire();
        });
      },
      reset: () => {
        api.setByPath('data.cached', cachedIdle);
      },
    },
  };
});

connectDebugLog(apiStore, { name: 'api' });

type QueryStateLike<T> = {
  isLoading: boolean;
  isFetching: boolean;
  data: T | null;
  error: Error | null;
};

const toQueryStateLike = <T,>(state: CachedState<T>, data: T | undefined): QueryStateLike<T> => ({
  isLoading: state.status === 'idle' || (state.status === 'pending' && !data),
  isFetching: state.status === 'pending',
  data: data ?? null,
  error: state.status === 'rejected' ? state.error : null,
});

export function UseStoreCachedSliceExample() {
  const cache = useStoreCachedSlice(apiStore, 'data.cached');
  const data = getCachedData(cache);

  const queryState = useStoreCachedSlice(apiStore, 'data.cached', {
    select: (cached, data) => toQueryStateLike(cached, data),
    equals: shallowEqual,
  });

  const status =
    cache.status === 'idle'
      ? 'Idle — loading...'
      : cache.status === 'pending'
        ? 'Loading...'
        : cache.status === 'fresh'
          ? 'Fresh'
          : cache.status === 'expired'
            ? 'Expired'
            : 'Error';

  return (
    <ExampleLayout
      result={
        cache.status === 'fresh' || cache.status === 'expired' ? (data?.name ?? null) : status
      }
    >
      <Stack direction="column" sx={{ gap: 2 }}>
        <Stack direction="row" sx={{ gap: 1, alignItems: 'center' }}>
          <Typography variant="body2" color="text.secondary" sx={{ minWidth: '80px' }}>
            Status:
          </Typography>
          <Chip
            label={status}
            size="small"
            color={
              cache.status === 'fresh'
                ? 'success'
                : cache.status === 'pending'
                  ? 'warning'
                  : 'default'
            }
            variant="outlined"
          />
          {cache.status === 'pending' && <CircularProgress size={20} />}
        </Stack>

        {data && (
          <Stack direction="column" sx={{ gap: 0.5 }}>
            <Typography variant="body2">
              <strong>ID:</strong> {data.id}
            </Typography>
            <Typography variant="body2">
              <strong>Name:</strong> {data.name}
            </Typography>
            <Typography variant="body2">
              <strong>Email:</strong> {data.email}
            </Typography>
          </Stack>
        )}

        <Stack direction="row" sx={{ gap: 1, flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            size="small"
            disabled={cache.status === 'pending'}
            onClick={() => {
              void apiStore.actions.forceRefresh();
            }}
          >
            Force Refresh
          </Button>
          <Button
            variant="outlined"
            size="small"
            disabled={cache.status !== 'fresh'}
            onClick={() => {
              apiStore.actions.expire();
            }}
          >
            Expire
          </Button>
          <Button
            variant="outlined"
            size="small"
            color="error"
            disabled={cache.status === 'idle'}
            onClick={() => {
              apiStore.actions.reset();
            }}
          >
            Reset
          </Button>
        </Stack>

        <Typography variant="caption" color="text.secondary">
          Auto-fetches on mount (idle → expired → onExpire). Refreshes every 10 s. Open the browser
          console with{' '}
          <code>localStorage.setItem(&apos;stardust:log=api&apos;, &apos;1&apos;)</code> to see
          debug logs. The typed selector helper also exposes `queryState.data` as
          <code>{queryState.data?.name ?? 'null'}</code>.
        </Typography>
      </Stack>
    </ExampleLayout>
  );
}
