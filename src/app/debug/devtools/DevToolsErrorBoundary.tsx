import { Component, type ErrorInfo, type ReactNode } from "react";
import { Copy, X } from "lucide-react";

interface Props {
  kind: "dock" | "console";
  onClose: () => void;
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class DevToolsErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[CombatBound] Debug ${this.props.kind} crashed`, error, info);
  }

  copyError = async () => {
    const message = this.state.error?.stack ?? this.state.error?.message ?? "Unknown debug-tools error";
    try {
      await navigator.clipboard?.writeText(message);
    } catch {
      // Clipboard access can be unavailable in a non-secure DEV preview.
    }
  };

  render() {
    if (!this.state.error) return this.props.children;
    const title = this.props.kind === "dock" ? "DEBUG DOCK ERROR" : "DEBUG CONSOLE ERROR";
    return <aside className={`debug-tools-error-fallback debug-tools-error-${this.props.kind}`} role="alert" data-debug-kind="debug-tools-error" data-debug-debug-surface={this.props.kind}>
      <strong>{title}</strong>
      <span>{this.state.error.message || "Unexpected debug-tools error"}</span>
      <div>
        <button type="button" onClick={this.copyError}><Copy size={12} /> COPY ERROR</button>
        <button type="button" onClick={this.props.onClose}><X size={12} /> CLOSE {this.props.kind.toUpperCase()}</button>
      </div>
    </aside>;
  }
}
