// ── React entry point ─────────────────────────────────────────────────────────
//
// Re-exports React-specific store primitives. Kept separate from the core barrel
// (`../index.ts`) so that the store module can be used in zero-React environments
// (Node, Vue, Svelte, plain JS) without importing React.

export { createStoreContext } from './create-store-context';
export type { CreateStoreContextOptions, StoreContextResult } from './create-store-context';

export { useStore } from './use-store';
export type { UseStoreOptions } from './use-store';

export { useSuspenseStore } from './use-suspense-store';
