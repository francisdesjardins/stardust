import { createContext, type ReactNode } from 'react';

export type CodePaneContextValue = {
  selectedExample: string | null;
  setSelectedExample: (id: string | null) => void;
  exampleActions: ReactNode | null;
  setExampleActions: (actions: ReactNode | null) => void;
  codeModalOpen: (() => void) | null;
  setCodeModalOpen: (fn: (() => void) | null) => void;
  readmeModalOpen: (() => void) | null;
  setReadmeModalOpen: (fn: (() => void) | null) => void;
  tldrModalOpen: (() => void) | null;
  setTldrModalOpen: (fn: (() => void) | null) => void;
};

export const CodePaneContext = createContext<CodePaneContextValue | null>(null);
