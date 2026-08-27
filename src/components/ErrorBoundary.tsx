import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}
interface State {
  error: Error | null;
}

// 页面级错误边界：单个页面渲染抛错时，仅在该区域显示回退信息，
// 避免整棵 React 树被卸载导致整个后台变白、所有页面都无法访问。
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error("页面渲染错误：", error);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          <p className="font-medium">页面渲染出错</p>
          <p className="mt-1 font-mono text-xs opacity-80">{this.state.error.message}</p>
          <button
            className="mt-3 rounded-md border border-border bg-card px-3 py-1.5 text-xs text-foreground hover:bg-accent"
            onClick={() => this.setState({ error: null })}
          >
            重试
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
