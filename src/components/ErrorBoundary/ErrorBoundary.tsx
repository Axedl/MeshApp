import { Component } from 'react';
import type { ReactNode, ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary] Uncaught render error:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div style={{ padding: '2rem', color: 'var(--primary)', fontFamily: 'inherit' }}>
          <div>[SYSTEM ERROR] A module has crashed.</div>
          <div style={{ marginTop: '0.5rem', opacity: 0.6, fontSize: '0.85em' }}>{this.state.message}</div>
          <button
            style={{ marginTop: '1rem' }}
            onClick={() => this.setState({ hasError: false, message: '' })}
          >
            [ RETRY ]
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
