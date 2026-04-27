import { use } from 'react';
import { CodePaneContext } from '@/app/providers/CodePaneProvider/CodePaneContext';

export const useCodePane = () => {
  const ctx = use(CodePaneContext);
  if (!ctx) {
    throw new Error('useCodePane must be used within CodePaneProvider');
  }
  return ctx;
};
