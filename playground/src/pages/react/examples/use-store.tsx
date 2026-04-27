import { connectDebugLog, createStore } from '@stardust/core';
import { useStore } from '@stardust/react';
import { Button, Chip, Stack, Typography } from '@mui/material';
import { ExampleLayout } from '@/entities/example';

type Todo = { id: number; text: string; done: boolean };

const todoStore = createStore({ todos: [] as Todo[], nextId: 1 }, ({ set, get }) => ({
  add(text: string) {
    const { todos, nextId } = get();
    set({ todos: [...todos, { id: nextId, text, done: false }], nextId: nextId + 1 });
  },
  toggle(id: number) {
    const s = get();
    set({ ...s, todos: s.todos.map((t) => (t.id === id ? { ...t, done: !t.done } : t)) });
  },
  clear() {
    set({ todos: [], nextId: 1 });
  },
}));

connectDebugLog(todoStore, { name: 'todo' });

const PRESETS = ['Buy groceries', 'Write tests', 'Ship it'];

export function UseStoreExample() {
  const { todos } = useStore(todoStore);
  const done = todos.filter((t) => t.done).length;

  return (
    <ExampleLayout result={`${String(done)}/${String(todos.length)} done`}>
      <Stack direction="row" sx={{ gap: 1, flexWrap: 'wrap' }}>
        {PRESETS.map((p) => (
          <Button
            key={p}
            variant="outlined"
            size="small"
            onClick={() => {
              todoStore.add(p);
            }}
          >
            + {p}
          </Button>
        ))}
        <Button
          variant="outlined"
          size="small"
          color="error"
          disabled={todos.length === 0}
          onClick={() => {
            todoStore.clear();
          }}
        >
          Clear
        </Button>
      </Stack>
      <Stack direction="row" sx={{ gap: 0.5, flexWrap: 'wrap' }}>
        {todos.map((t) => (
          <Chip
            key={t.id}
            label={t.text}
            size="small"
            variant={t.done ? 'filled' : 'outlined'}
            color={t.done ? 'primary' : 'default'}
            onClick={() => {
              todoStore.toggle(t.id);
            }}
          />
        ))}
      </Stack>
      <Typography variant="caption" color="text.secondary">
        Click a chip to toggle done
      </Typography>
    </ExampleLayout>
  );
}
