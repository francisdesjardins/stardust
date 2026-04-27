import { Component, type ReactNode } from 'react';

type Props = { readonly fallback: ReactNode; readonly children: ReactNode };
type State = { readonly error: Error | undefined };

/**
 * Minimal class-based ErrorBoundary for test harnesses.
 * Renders `fallback` when any descendant throws an Error.
 * Exposes `reset()` via a `data-testid="error-boundary-reset"` button.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { error: undefined };
  }

  static getDerivedStateFromError(error: unknown): State {
    return { error: error instanceof Error ? error : new Error(String(error)) };
  }

  override render(): ReactNode {
    const { error } = this.state;
    if (error !== undefined) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}
