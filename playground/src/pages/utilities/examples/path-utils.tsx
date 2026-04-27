import { copyOnWritePath, getAtPath, parsePath } from '@stardust/core';
import { Button, Chip, Stack, Typography } from '@mui/material';
import { useState } from 'react';
import { ExampleLayout } from '@/entities/example';

type State = {
  user: { name: string; score: number };
  meta: { views: number };
};

const initial: State = { user: { name: 'Alice', score: 0 }, meta: { views: 42 } };

// Segments are memoized — parsed once, reused on every call
const scoreSegments = parsePath('user.score');

export function PathUtilsExample() {
  const [state, setState] = useState(initial);
  const [metaShared, setMetaShared] = useState(true);

  const score = getAtPath(state, scoreSegments) as number;

  const incrementScore = () => {
    const next = copyOnWritePath(state, scoreSegments, score + 1);
    // Unchanged branches keep their reference — only the mutation spine is copied
    setMetaShared(next.meta === state.meta);
    setState(next);
  };

  const reset = () => {
    setState(initial);
    setMetaShared(true);
  };

  return (
    <ExampleLayout result={`score: ${String(score)}`}>
      <Button variant="outlined" size="small" onClick={incrementScore}>
        Increment score
      </Button>
      <Button variant="outlined" size="small" color="error" onClick={reset}>
        Reset
      </Button>
      <Stack direction="row" sx={{ gap: 1, alignItems: 'center', width: '100%' }}>
        <Typography variant="body2" color="text.secondary">
          state.meta reference after write:
        </Typography>
        <Chip
          label={metaShared ? 'unchanged (===)' : 'different (new ref)'}
          size="small"
          color={metaShared ? 'success' : 'warning'}
        />
      </Stack>
      <Typography variant="caption" color="text.disabled" sx={{ width: '100%' }}>
        copyOnWritePath shallow-copies only the path spine — sibling branches share identity
      </Typography>
    </ExampleLayout>
  );
}
