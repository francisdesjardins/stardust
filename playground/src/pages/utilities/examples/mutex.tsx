import { createMutex, createStore } from '@stardust/core';
import { useStore } from '@stardust/react';
import { Button, Chip, LinearProgress, Stack, Typography } from '@mui/material';
import { ExampleLayout } from '@/entities/example';

type Job = { id: number; status: 'queued' | 'running' | 'done' };

const mutex = createMutex();
let nextId = 1;

const jobStore = createStore({ jobs: [] as Job[] }, ({ set, get }) => ({
  async run() {
    const id = nextId++;
    set({ jobs: [...get().jobs, { id, status: 'queued' }] });

    await mutex(async () => {
      set({ jobs: get().jobs.map((j) => (j.id === id ? { ...j, status: 'running' } : j)) });
      await new Promise<void>((r) => setTimeout(r, 700));
      set({ jobs: get().jobs.map((j) => (j.id === id ? { ...j, status: 'done' } : j)) });
    });
  },
  clear() {
    set({ jobs: [] });
    nextId = 1;
  },
}));

const queueThree = () => {
  void jobStore.run();
  void jobStore.run();
  void jobStore.run();
};

export function MutexExample() {
  const { jobs } = useStore(jobStore);

  const queued = jobs.filter((j) => j.status === 'queued').length;
  const running = jobs.filter((j) => j.status === 'running').length;
  const done = jobs.filter((j) => j.status === 'done').length;

  return (
    <ExampleLayout
      result={`${String(done)} done · ${String(running)} running · ${String(queued)} queued`}
    >
      <Button variant="outlined" size="small" onClick={() => void jobStore.run()}>
        Queue job
      </Button>
      <Button variant="outlined" size="small" onClick={queueThree}>
        Queue 3 (concurrent)
      </Button>
      <Button
        variant="outlined"
        size="small"
        color="error"
        disabled={jobs.length === 0}
        onClick={() => {
          jobStore.clear();
        }}
      >
        Clear
      </Button>

      {running > 0 && <LinearProgress sx={{ width: '100%' }} />}

      <Stack direction="row" sx={{ gap: 0.5, flexWrap: 'wrap', width: '100%' }}>
        {jobs.map((j) => (
          <Chip
            key={j.id}
            label={`Job ${String(j.id)}`}
            size="small"
            color={j.status === 'done' ? 'success' : j.status === 'running' ? 'warning' : 'default'}
            variant={j.status === 'queued' ? 'outlined' : 'filled'}
          />
        ))}
      </Stack>

      {jobs.length > 0 && (
        <Typography variant="caption" color="text.secondary">
          {queued > 0
            ? `${String(queued)} waiting behind the gate — serialized, not dropped`
            : running > 0
              ? 'gate is held — next job starts when this one resolves'
              : 'all jobs ran, each exactly once'}
        </Typography>
      )}
    </ExampleLayout>
  );
}
