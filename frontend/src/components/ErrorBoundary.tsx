import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }): void {
    console.error("Unhandled error:", error, info.componentStack);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleHome = () => {
    window.location.href = "/";
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="auth-shell">
        <div className="auth-card">
          <div className="auth-brand">
            <span className="auth-brand-mark">D</span>
            <span>D&D Manager</span>
          </div>

          <h1 style={{ marginTop: 16 }}>Что-то пошло не так</h1>
          <p className="muted" style={{ marginBottom: 24 }}>
            Произошла непредвиденная ошибка. Попробуйте обновить страницу —
            если проблема повторится, вернитесь на главную.
          </p>

          <button
            type="button"
            className="btn btn-primary btn-block"
            onClick={this.handleReload}
          >
            Обновить страницу
          </button>

          <p className="muted" style={{ marginTop: 20, fontSize: 13.5 }}>
            <a href="/" onClick={this.handleHome}>На главную</a>
          </p>
        </div>
      </div>
    );
  }
}
