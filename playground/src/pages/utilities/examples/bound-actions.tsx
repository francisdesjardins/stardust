import { createBoundActions, createStore } from '@stardust/core';
import { useStore } from '@stardust/react';
import { Button, Chip, Stack, Typography } from '@mui/material';
import { ExampleLayout } from '@/entities/example';

// ── Store ─────────────────────────────────────────────────────────────────────

type Todo = { id: number; text: string; done: boolean };

const todoStore = createStore({ todos: [] as Todo[], nextId: 1 }, ({ update, reset }) => ({
  todos: {
    add(text: string) {
      update((d) => {
        d.todos.push({ id: d.nextId, text, done: false });
        d.nextId += 1;
      });
    },
    toggle(id: number) {
      update((d) => {
        const item = d.todos.find((t) => t.id === id);
        if (item) item.done = !item.done;
      });
    },
    remove(id: number) {
      update((d) => {
        d.todos = d.todos.filter((t) => t.id !== id);
      });
    },
  },
  reset() {
    reset();
  },
}));

// Full access — all nested methods reachable via property access
const actions = createBoundActions(todoStore);

// Restricted variant — remove is excluded both at the type level and at runtime
const safeActions = createBoundActions(todoStore, {
  domain: ['todos.add', 'todos.toggle'],
});

const PRESETS = ['Buy milk', 'Walk the dog', 'Ship the feature'];

// ── Component ─────────────────────────────────────────────────────────────────

export function BoundActionsExample() {
  const { todos } = useStore(todoStore);
  const done = todos.filter((t) => t.done).length;

  return (
    <ExampleLayout result={`${String(done)} / ${String(todos.length)} done`}>
      <Stack direction="row" sx={{ gap: 1, flexWrap: 'wrap' }}>
        {PRESETS.map((text) => (
          <Button
            key={text}
            variant="outlined"
            size="small"
            onClick={() => {
              // Nested property-access call — no string dispatch
              safeActions.todos.add(text);
            }}
          >
            add "{text}"
          </Button>
        ))}
        <Button
          variant="outlined"
          size="small"
          color="error"
          onClick={() => {
            todoStore.reset();
          }}
        >
          Reset
        </Button>
      </Stack>

      <Stack sx={{ gap: 0.5, width: '100%' }}>
        {todos.map((todo) => (
          <Stack key={todo.id} direction="row" sx={{ gap: 1, alignItems: 'center' }}>
            <Chip
              label={todo.text}
              size="small"
              color={todo.done ? 'success' : 'default'}
              variant={todo.done ? 'filled' : 'outlined'}
              onClick={() => {
                safeActions.todos.toggle(todo.id);
              }}
            />
            <Button
              size="small"
              color="error"
              sx={{ minWidth: 0, px: 1 }}
              onClick={() => {
                // remove requires the unrestricted `actions` — excluded from safeActions
                actions.todos.remove(todo.id);
              }}
            >
              ✕
            </Button>
          </Stack>
        ))}
        {todos.length === 0 && (
          <Typography variant="caption" color="text.disabled">
            add a todo above — click a chip to toggle done
          </Typography>
        )}
      </Stack>

      <Typography variant="caption" color="text.secondary">
        <code>safeActions</code> is restricted to <code>todos.add</code> and{' '}
        <code>todos.toggle</code> — calling <code>safeActions.todos.remove</code> is a compile-time
        error and throws at runtime.
      </Typography>
    </ExampleLayout>
  );
}
