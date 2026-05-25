import { createLastFlight, createStore } from '@stardust/core';
import { useStore } from '@stardust/react';
import { Button, Chip, Stack, TextField, Typography } from '@mui/material';

type RequestEntry = { query: string; status: 'aborted' | 'resolved' };

// Simulates fetch(url, { signal }) — rejects with AbortError when superseded.
const fakeSearch = (query: string, signal: AbortSignal): Promise<string[]> =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      resolve([`${query} — result A`, `${query} — result B`, `${query} — result C`]);
    }, 700);
    signal.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(new DOMException('The operation was aborted.', 'AbortError'));
    });
  });

const searchFlight = createLastFlight();

const MAX_VISIBLE = 8;

const searchStore = createStore(
  {
    query: '',
    results: [] as string[],
    pending: false,
    requests: [] as RequestEntry[],
    totalFired: 0,
    totalAborted: 0,
    totalResolved: 0,
  },
  ({ update, reset }) => ({
    reset() {
      reset();
    },
    setQuery(query: string) {
      update((d) => {
        const trimStart =
          d.requests.length >= MAX_VISIBLE ? d.requests.length - MAX_VISIBLE + 1 : 0;
        d.query = query;
        d.results = [];
        d.pending = true;
        d.totalFired += 1;
        d.totalAborted += 1;
        d.requests = [...d.requests.slice(trimStart), { query, status: 'aborted' }];
      });

      void searchFlight(async (signal) => {
        let results: string[];
        try {
          results = await fakeSearch(query, signal);
        } catch (err) {
          if (err instanceof Error && err.name !== 'AbortError') {
            update((d) => {
              d.pending = false;
            });
          }
          return;
        }

        update((d) => {
          d.results = results;
          d.pending = false;
          d.totalAborted -= 1;
          d.totalResolved += 1;
          const entry = d.requests.findLast((r) => r.query === query && r.status === 'aborted');
          if (entry) entry.status = 'resolved';
        });
      });
    },
  })
);

export function SingleFlightLastExample() {
  const { query, results, pending, requests, totalFired, totalAborted, totalResolved } =
    useStore(searchStore);
  const hidden = totalFired - requests.length;

  return (
    <Stack sx={{ gap: 2 }}>
      <TextField
        label="Search"
        size="small"
        value={query}
        placeholder="type quickly to see aborts…"
        onChange={(e) => {
          searchStore.setQuery(e.target.value);
        }}
        slotProps={{ input: { sx: { fontFamily: 'monospace' } } }}
      />

      <Stack direction="row" sx={{ gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
        <Button
          size="small"
          variant="outlined"
          color="error"
          disabled={totalFired === 0}
          onClick={() => {
            searchStore.reset();
          }}
        >
          Reset
        </Button>
        <Typography variant="body2" color="text.secondary">
          {String(totalFired)} fired → <strong>{String(totalAborted)}</strong> aborted,{' '}
          <strong>{String(totalResolved)}</strong> resolved{pending ? ' (in-flight…)' : ''}
        </Typography>
      </Stack>

      {totalFired > 0 && (
        <Stack direction="row" sx={{ gap: 0.5, flexWrap: 'wrap', alignItems: 'center' }}>
          {hidden > 0 && (
            <Typography variant="caption" color="text.disabled">
              +{String(hidden)} older
            </Typography>
          )}
          {requests.map((r, i) => (
            <Chip
              key={i}
              label={`"${r.query}"`}
              size="small"
              color={r.status === 'resolved' ? 'success' : 'default'}
              variant={r.status === 'resolved' ? 'filled' : 'outlined'}
            />
          ))}
        </Stack>
      )}

      {results.length > 0 && (
        <Stack sx={{ gap: 0.25 }}>
          {results.map((r, i) => (
            <Typography key={i} variant="body2" sx={{ fontFamily: 'monospace' }}>
              {r}
            </Typography>
          ))}
        </Stack>
      )}
    </Stack>
  );
}
