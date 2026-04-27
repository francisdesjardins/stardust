# playground/CLAUDE.md

Vite + React 19 app that demos all three Stardust packages. Feature-Sliced Design (FSD) layout. SolidJS islands coexist via a dual-JSX Vite config.

## Commands

```bash
npm run dev        # from monorepo root — dev server at localhost:3001
npm run build      # from monorepo root — builds playground to playground/dist/
```

## Routes

| Route              | Page component           | Package demoed    |
| ------------------ | ------------------------ | ----------------- |
| `/getting-started` | `pages/getting-started/` | `@stardust/core`  |
| `/react`           | `pages/react/`           | `@stardust/react` |
| `/solid`           | `pages/solid/`           | `@stardust/solid` |

## Adding an Example

1. **Create the example file** in the matching page's `examples/` directory:

   ```
   src/pages/getting-started/examples/my-feature.tsx
   src/pages/react/examples/my-hook.tsx
   src/pages/solid/examples/my-island.solid.tsx   ← SolidJS only
   ```

2. **Register the source in `codeSamples.ts`**:

   ```ts
   // src/widgets/code-viewer/model/codeSamples.ts
   import myFeatureSrc from '@/pages/getting-started/examples/my-feature.tsx?raw';
   export const codeSamples = {
     'my-feature': myFeatureSrc,
     // ...
   };
   ```

3. **Add an `ExampleCard` to the page** (`pages/<route>/ui/<Route>Page.tsx`):
   ```tsx
   <ExampleCard title="myFeature" description="..." codeKey="my-feature">
     <MyFeatureExample />
   </ExampleCard>
   ```

## Shared Components

| Component        | Import                                      | Purpose                                                       |
| ---------------- | ------------------------------------------- | ------------------------------------------------------------- |
| `ExampleCard`    | `@/entities/example`                        | Titled card with hover effect and optional "View Code" button |
| `ExampleLayout`  | `@/entities/example`                        | `result` string display + children layout inside a card       |
| `PageLayout`     | `@/shared/ui/PageLayout/PageLayout`         | Page title + description wrapper                              |
| `CodeBlock`      | `@/shared/ui/CodeBlock/CodeBlock`           | Syntax-highlighted code block (used in the code modal)        |
| `ViewCodeButton` | `@/shared/ui/ViewCodeButton/ViewCodeButton` | Button that opens the code modal for a given `codeKey`        |
| `ResultDisplay`  | `@/shared/ui/ResultDisplay/ResultDisplay`   | Renders a string result badge; hidden when `result` is null   |

### ExampleLayout usage

Use inside a card's children when the example produces a single observable result string:

```tsx
export function MyExample() {
  const { value } = useStore(myStore);
  return (
    <ExampleLayout result={String(value)}>
      <Button onClick={() => myStore.increment()}>Increment</Button>
    </ExampleLayout>
  );
}
```

## SolidJS Islands

SolidJS components **must** live in `*.solid.tsx` files — Vite routes them through `vite-plugin-solid` while all other `.tsx` files go through `@vitejs/plugin-react`.

Mount a SolidJS component from React via `useEffect` + `render`:

```tsx
// my-widget.solid.tsx  ← processed by vite-plugin-solid
import { useStore } from '@stardust/solid';
export function MyWidget(props: { store: StoreContract<{ count: number }> }) {
  const state = useStore(props.store);
  return <p>Count: {state().count}</p>;
}

// MyWidgetWrapper.tsx  ← processed by @vitejs/plugin-react
import { render } from 'solid-js/web';
import { useEffect, useRef } from 'react';
import { MyWidget } from './my-widget.solid';

export function MyWidgetWrapper({ store }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    return render(() => MyWidget({ store }) as any, ref.current);
  }, [store]);
  return <div ref={ref} />;
}
```

Key rules:

- Call the SolidJS component **as a plain function** (not JSX) inside `render()` to avoid the React JSX transform being applied to SolidJS JSX
- The `as any` cast suppresses the React vs SolidJS `JSX.Element` type mismatch
- `render()` returns a dispose function — returning it from `useEffect` makes React 19 StrictMode double-invoke safe

## MUI Conventions

- `Grid` (not `Grid2`) — use `<Grid size={{ xs: 12, md: 6 }}>`
- Stack: `gap`, `flexWrap`, `alignItems` must be in `sx`, not direct props
- Dialog: use `slotProps.paper` (not `PaperProps` — removed in MUI v9)

## FSD Structure

```
src/
├── app/          main.tsx, router.tsx, ThemeProvider, CodePaneProvider
├── pages/        getting-started/, react/, solid/, lab/
│   └── <route>/
│       ├── examples/   one file per demo component
│       ├── ui/         <Route>Page.tsx  (the page component)
│       └── index.ts    barrel export
├── widgets/      code-viewer/, root-layout/, sidebar/, top-bar/
├── entities/     example/ (ExampleCard, ExampleLayout)
└── shared/       lib/, ui/
```
