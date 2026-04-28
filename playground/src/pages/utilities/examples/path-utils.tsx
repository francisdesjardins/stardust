import { copyOnWritePath, getAtPath, parsePath } from '@stardust/core';
import { Chip, Stack, Typography } from '@mui/material';
import { Button } from '@mui/material';
import { useState } from 'react';
import { ExampleLayout } from '@/entities/example';

type State = {
  user: { name: string; score: number };
  settings: { theme: string; lang: string };
  meta: { views: number };
};

const initial: State = {
  user: { name: 'Alice', score: 0 },
  settings: { theme: 'dark', lang: 'en' },
  meta: { views: 42 },
};

const WRITES: { label: string; path: string; value: () => unknown }[] = [
  { label: 'user.score++', path: 'user.score', value: () => undefined },
  { label: 'settings.theme → light', path: 'settings.theme', value: () => 'light' },
  { label: 'settings.theme → dark', path: 'settings.theme', value: () => 'dark' },
  { label: 'meta.views++', path: 'meta.views', value: () => undefined },
];

const TOP_LEVEL_KEYS = ['user', 'settings', 'meta'] as const;

export function PathUtilsExample() {
  const [state, setState] = useState(initial);
  const [prev, setPrev] = useState(initial);
  const [lastPath, setLastPath] = useState<string | null>(null);

  const write = (path: string, rawValue: unknown) => {
    const segments = parsePath(path);
    const current = getAtPath(state, segments);
    const value = typeof current === 'number' ? current + 1 : rawValue;
    const next = copyOnWritePath(state, segments, value);
    setPrev(state);
    setState(next);
    setLastPath(path);
  };

  const reset = () => {
    setPrev(initial);
    setState(initial);
    setLastPath(null);
  };

  const segments = lastPath ? parsePath(lastPath) : null;

  return (
    <ExampleLayout result={lastPath ? `wrote → ${lastPath}` : 'no write yet'}>
      <Stack direction="column" sx={{ gap: 1.5, width: '100%' }}>
        <Stack direction="row" sx={{ gap: 1, flexWrap: 'wrap' }}>
          {WRITES.map((w) => (
            <Button
              key={w.label}
              variant="outlined"
              size="small"
              onClick={() => {
                write(w.path, w.value());
              }}
            >
              {w.label}
            </Button>
          ))}
          <Button variant="outlined" size="small" color="error" onClick={reset}>
            Reset
          </Button>
        </Stack>

        {segments && (
          <Stack direction="row" sx={{ gap: 0.5, alignItems: 'center', flexWrap: 'wrap' }}>
            <Typography variant="caption" color="text.secondary">
              parsePath("{lastPath}") →
            </Typography>
            {segments.map((seg, i) => (
              <Chip key={i} label={String(seg)} size="small" variant="outlined" color="primary" />
            ))}
          </Stack>
        )}

        <Stack direction="row" sx={{ gap: 1, flexWrap: 'wrap' }}>
          {TOP_LEVEL_KEYS.map((key) => {
            const changed = state[key] !== prev[key];
            return (
              <Chip
                key={key}
                label={`${key} ${changed ? '(new ref)' : '(shared)'}`}
                size="small"
                color={changed ? 'warning' : 'success'}
                variant={changed ? 'filled' : 'outlined'}
              />
            );
          })}
        </Stack>

        <Stack direction="column" sx={{ gap: 0.25 }}>
          {TOP_LEVEL_KEYS.map((key) =>
            Object.entries(state[key]).map(([field]) => {
              const path = `${key}.${field}`;
              const segs = parsePath(path);
              return (
                <Typography key={path} variant="caption" sx={{ fontFamily: 'monospace' }}>
                  getAtPath(state, "{path}") ={' '}
                  <strong>{JSON.stringify(getAtPath(state, segs))}</strong>
                </Typography>
              );
            })
          )}
        </Stack>
      </Stack>
    </ExampleLayout>
  );
}
