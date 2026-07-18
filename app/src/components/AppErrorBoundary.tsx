import { Component, type ErrorInfo, type ReactNode } from "react";
import "./AppErrorBoundary.css";

interface Props { children: ReactNode; }
interface State { hasError: boolean; }

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State { return { hasError: true }; }
  componentDidCatch(error: Error, info: ErrorInfo): void { console.error("Shoot Logでエラーが発生しました。", error, info); }

  render() {
    if (this.state.hasError) {
      return <main className="app-error"><p className="eyebrow">SHOOT LOG</p><h1>画面を表示できませんでした</h1><p>入力済みデータはLocalStorageに残っています。ページを再読み込みしてください。</p><button onClick={() => window.location.reload()}>再読み込み</button></main>;
    }
    return this.props.children;
  }
}
