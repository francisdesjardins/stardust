import { connectDebugLog, createArrayMethods, createStore } from '@stardust/core';
import { useStore } from '@stardust/react';
import { Button, Chip, Divider, Stack, Typography } from '@mui/material';
import { ExampleLayout } from '@/entities/example';

type Item = { name: string; qty: number; picked: boolean };

const initialItem: Item = { name: '', qty: 1, picked: false };
const initialItems: Item[] = [];

const listOps = createArrayMethods(initialItem);
const listStore = createStore({ items: initialItems }, (api) => ({
  list: listOps.mount(api, 'items'),
}));

connectDebugLog(listStore, { name: 'list' });

const PRESETS = ['Milk', 'Eggs', 'Bread', 'Butter'] as const;

// Simulated server sync — each "fetch" updates qty and adds new items
type ServerItem = { name: string; qty: number };
const SERVER_BATCHES: ServerItem[][] = [
  [
    { name: 'Milk', qty: 2 },
    { name: 'Eggs', qty: 12 },
    { name: 'Cheese', qty: 1 },
  ],
  [
    { name: 'Milk', qty: 1 },
    { name: 'Butter', qty: 3 },
    { name: 'Yogurt', qty: 2 },
  ],
];
let batchIndex = 0;

export function ArrayMethodsExample() {
  const items = useStore(listStore, (s) => s.items);
  const picked = items.filter((i) => i.picked).length;

  function syncFromServer() {
    const batch = SERVER_BATCHES[batchIndex % SERVER_BATCHES.length] ?? [];
    batchIndex++;
    listStore.list.upsert(
      batch.map((s) => ({ ...initialItem, name: s.name, qty: s.qty })),
      function (item) {
        return item.name === this.name;
      }
    );
  }

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

        {/* upsert() — replace by predicate or append */}
        <Divider />
        <Stack direction="row" sx={{ gap: 1, alignItems: 'center' }}>
          <Button variant="outlined" size="small" onClick={syncFromServer}>
            sync from server
          </Button>
          <Typography variant="caption" color="text.secondary">
            upsert by name — updates qty if present, appends if new
          </Typography>
        </Stack>
      </Stack>
    </ExampleLayout>
  );
}
