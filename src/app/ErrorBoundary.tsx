import { Component, type ErrorInfo, type ReactNode } from "react";

/** Last-resort React error boundary for unrecoverable render failures. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  /**
   * Switches the boundary into its failed state after a render error.
   *
   * @returns Partial state update consumed by React.
   */
  static getDerivedStateFromError() { return { failed: true }; }

  /**
   * Logs render errors for local debugging.
   *
   * @param error - Error thrown by a descendant component.
   * @param info - React component stack for the failure.
   * @returns Nothing; errors are logged to the console.
   */
  componentDidCatch(error: Error, info: ErrorInfo) { console.error(error, info); }

  /**
   * Renders either the fallback recovery screen or the child tree.
   *
   * @returns React node for the current boundary state.
   */
  render() {
    if (this.state.failed) return <div className="error-screen"><span className="eyebrow">Unexpected error</span><h1>Full Time needs a restart.</h1><p>Reload the app to return to your competition.</p><button className="button button--primary" onClick={() => window.location.reload()}>Reload app</button></div>;
    return this.props.children;
  }
}
