import { Component, type ErrorInfo, type ReactNode } from "react";

export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error(error, info); }
  render() {
    if (this.state.failed) return <div className="error-screen"><span className="eyebrow">Unexpected error</span><h1>Full Time needs a restart.</h1><p>Reload the app to return to your competition.</p><button className="button button--primary" onClick={() => window.location.reload()}>Reload app</button></div>;
    return this.props.children;
  }
}
