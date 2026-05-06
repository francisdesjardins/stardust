import { connectDebugLog, createStore } from '@stardust/core';
import { useStore } from '@stardust/react';
import { Button, Chip, Stack, Typography } from '@mui/material';
import { ExampleLayout } from '@/entities/example';
import { createArrayMethods } from '@stardust/core';

type Todo = { id: number; text: string; done: boolean };

const initialSnapshot = { todos: [] as Todo[], nextId: 1 };

const todosOps = createArrayMethods<Todo>({ id: 0, text: '', done: false });
const todoStore = createStore(initialSnapshot, (api) => {
  const { batch, get, setByPath } = api;

  const todos = todosOps.mount(api, 'todos');

  return {
    actions: {
      todos: {
        add(text: string) {
          batch(() => {
            const snapshot = get();
            todos.add({ text, done: false, id: snapshot.nextId });
            setByPath('nextId', snapshot.nextId + 1);
          });
        },
        toggle(id: number) {
          todos.update(
            (t) => t.id === id,
            (s) => ({ done: !s.done })
          );
        },
      },
    },
  };
});

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
              todoStore.actions.todos.add(p);
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
            todoStore.reset();
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
              todoStore.actions.todos.toggle(t.id);
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
