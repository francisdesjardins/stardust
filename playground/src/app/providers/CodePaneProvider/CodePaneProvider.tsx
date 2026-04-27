import { useState, type ReactNode } from 'react';
import { CodePaneContext, type CodePaneContextValue } from './CodePaneContext';

export const CodePaneProvider = ({ children }: { children: ReactNode }) => {
  const [selectedExample, setSelectedExample] = useState<string | null>(null);
  const [exampleActions, setExampleActions] =
    useState<CodePaneContextValue['exampleActions']>(null);
  const [codeModalOpen, setCodeModalOpen] = useState<CodePaneContextValue['codeModalOpen']>(null);
  const [readmeModalOpen, setReadmeModalOpen] =
    useState<CodePaneContextValue['readmeModalOpen']>(null);
  const [tldrModalOpen, setTldrModalOpen] = useState<CodePaneContextValue['tldrModalOpen']>(null);

  return (
    <CodePaneContext
      value={{
        selectedExample,
        setSelectedExample,
        exampleActions,
        setExampleActions,
        codeModalOpen,
        setCodeModalOpen,
        readmeModalOpen,
        setReadmeModalOpen,
        tldrModalOpen,
        setTldrModalOpen,
      }}
    >
      {children}
    </CodePaneContext>
  );
};
