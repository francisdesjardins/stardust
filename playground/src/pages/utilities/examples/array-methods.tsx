import { createArrayMethods, createStore } from '@stardust/core';
import { useStore } from '@stardust/react';
import { Button, Chip, Stack, TextField, Typography } from '@mui/material';
import { useState } from 'react';
import { ExampleLayout } from '@/entities/example';

type Todo = { text: string; done: boolean };

const todoStore = createStore({ todos: [] as Todo[] }, (api) => ({
  items: createArrayMethods(api, 'todos', { text: '', done: false }),
}));

export function ArrayMethodsExample() {
  const { todos } = useStore(todoStore);
  const [draft, setDraft] = useState('');

  const pending = todos.filter((t) => !t.done).length;

  const addItem = () => {
    const text = draft.trim();
    if (text) {
      todoStore.items.add({ text });
      setDraft('');
    }
  };

  return (
    <ExampleLayout result={`${String(pending)} pending / ${String(todos.length)} total`}>
      <Stack direction="column" sx={{ gap: 1, width: '100%' }}>
        <Stack direction="row" sx={{ gap: 1 }}>
          <TextField
            size="small"
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
            }}
            placeholder="New item…"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                addItem();
              }
            }}
            sx={{ width: 160 }}
          />
          <Button variant="outlined" size="small" onClick={addItem}>
            Add
          </Button>
        </Stack>
        <Stack direction="column" sx={{ gap: 0.5 }}>
          {todos.map((todo, i) => (
            <Stack key={i} direction="row" sx={{ gap: 0.5, alignItems: 'center' }}>
              <Chip
                label={todo.text}
                size="small"
                variant={todo.done ? 'filled' : 'outlined'}
                color={todo.done ? 'success' : 'default'}
                onClick={() => {
                  todoStore.items.set(i, { done: !todo.done });
                }}
                sx={{ cursor: 'pointer' }}
              />
              {i > 0 && (
                <Button
                  size="small"
                  onClick={() => {
                    todoStore.items.move(i, i - 1);
                  }}
                >
                  ↑
                </Button>
              )}
              {i < todos.length - 1 && (
                <Button
                  size="small"
                  onClick={() => {
                    todoStore.items.move(i, i + 1);
                  }}
                >
                  ↓
                </Button>
              )}
              <Button
                size="small"
                color="error"
                onClick={() => {
                  todoStore.items.remove(i);
                }}
              >
                ✕
              </Button>
            </Stack>
          ))}
          {todos.length === 0 && (
            <Typography variant="body2" color="text.disabled">
              No items — type above and press Enter
            </Typography>
          )}
        </Stack>
      </Stack>
    </ExampleLayout>
  );
}
