# Stardust × React

**Zero-dependency POJO state management for React.**

This package provides React hooks and context helpers for Stardust stores, enabling tear-free, concurrent-safe state management in React 19+.

## Why use this package?

- Simple, serializable state (POJO snapshots)
- No runtime dependencies beyond React
- Built on `useSyncExternalStore` for concurrent safety
- Supports selectors, context injection, and async state

## Installation

```bash
npm install @stardust/react
```

## Basic Usage

```tsx
import { createStore } from '@stardust/core';
import { useStore } from '@stardust/react';

const counter = createStore({ count: 0 }, ({ update }) => ({
  increment() {
    update((d) => {
      d.count++;
    });
  },
}));

function Counter() {
  const count = useStore(counter, (s) => s.count);
  return <button onClick={counter.increment}>{count}</button>;
}
```

## API Reference

> API Reference will be auto-generated from JSDoc in a future release.

## License

MIT — see [LICENSE](../../LICENSE)

## Contributing

Contributions welcome! Please see the monorepo README for guidelines.
