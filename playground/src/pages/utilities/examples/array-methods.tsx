import { connectDebugLog, createArrayMethods, createStore } from '@stardust/core';
import { useStore } from '@stardust/react';
import { Button, Chip, Stack, Typography } from '@mui/material';
import { ExampleLayout } from '@/entities/example';

// Items have a nested `qty` field — good target for setByPath
type Item = { name: string; qty: number; picked: boolean };

const DEFAULTS: Item = { name: '', qty: 1, picked: false };

const listStore = createStore({ items: [] as Item[] }, (api) => ({
  list: createArrayMethods(api, 'items', DEFAULTS),
}));

connectDebugLog(listStore, { name: 'list' });

const PRESETS = ['Milk', 'Eggs', 'Bread', 'Butter'] as const;

export function ArrayMethodsExample() {
  const { items } = useStore(listStore);
  const picked = items.filter((i) => i.picked).length;

  return (
    <ExampleLayout result={`${String(picked)} / ${String(items.length)} picked`}>
      <Stack direction="column" sx={{ gap: 1, width: '100%' }}>
        {/* add() with overrides */}
        <Stack direction="row" sx={{ gap: 1, flexWrap: 'wrap' }}>
          {PRESETS.map((name) => (
            <Button
              key={name}
              variant="outlined"
              size="small"
              disabled={items.some((i) => i.name === name)}
              onClick={() => {
                listStore.list.add({ name });
              }}
            >
              + {name}
            </Button>
          ))}
          <Button
            variant="outlined"
            size="small"
            color="error"
            disabled={items.length === 0}
            onClick={() => {
              // remove() from the end
              listStore.list.remove(items.length - 1);
            }}
          >
            remove last
          </Button>
        </Stack>

        <Stack direction="column" sx={{ gap: 0.5 }}>
          {items.map((item, i) => (
            <Stack key={i} direction="row" sx={{ gap: 0.5, alignItems: 'center' }}>
              {/* set() — patch multiple fields at once */}
              <Chip
                label={item.name}
                size="small"
                variant={item.picked ? 'filled' : 'outlined'}
                color={item.picked ? 'success' : 'default'}
                onClick={() => {
                  listStore.list.set(i, { picked: !item.picked });
                }}
                sx={{ cursor: 'pointer', minWidth: 56 }}
              />
              {/* setByPath() — surgical single-field update */}
              <Typography variant="caption" color="text.secondary">
                qty
              </Typography>
              <Button
                size="small"
                disabled={item.qty <= 1}
                onClick={() => {
                  listStore.list.setByPath(i, 'qty', item.qty - 1);
                }}
              >
                −
              </Button>
              <Typography variant="caption" sx={{ minWidth: 12, textAlign: 'center' }}>
                {item.qty}
              </Typography>
              <Button
                size="small"
                onClick={() => {
                  listStore.list.setByPath(i, 'qty', item.qty + 1);
                }}
              >
                +
              </Button>
              {/* move() */}
              {i > 0 && (
                <Button
                  size="small"
                  onClick={() => {
                    listStore.list.move(i, i - 1);
                  }}
                >
                  ↑
                </Button>
              )}
              {i < items.length - 1 && (
                <Button
                  size="small"
                  onClick={() => {
                    listStore.list.move(i, i + 1);
                  }}
                >
                  ↓
                </Button>
              )}
            </Stack>
          ))}
          {items.length === 0 && (
            <Typography variant="body2" color="text.disabled">
              Add items above — click a name to toggle picked, ±qty uses setByPath
            </Typography>
          )}
        </Stack>
      </Stack>
    </ExampleLayout>
  );
}
