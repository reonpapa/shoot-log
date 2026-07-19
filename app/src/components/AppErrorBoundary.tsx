import { Component, type ErrorInfo, type ReactNode } from "react";
import "./AppErrorBoundary.css";
import { recoverPwaShell } from "../services/pwaRecovery";

interface Props { children: ReactNode; }
interface State { hasError: boolean; recovering: boolean; }

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, recovering: false };

  static getDerivedStateFromError(): Partial<State> { return { hasError: true }; }
  componentDidCatch(error: Error, info: ErrorInfo): void { console.error("Shoot Logでエラーが発生しました。", error, info); }

  recover = async () => {
    this.setState({ recovering: true });
    await recoverPwaShell();
  };

  render() {
    if (this.state.hasError) {
      return <main className="app-error"><p className="eyebrow">SHOOT LOG</p><h1>画面を表示できませんでした</h1><p>入力済みデータを残したまま、アプリの更新キャッシュだけを再構築できます。</p><button disabled={this.state.recovering} onClick={() => void this.recover()}>{this.state.recovering ? "復旧しています…" : "アプリを安全に復旧"}</button></main>;
    }
    return this.props.children;
  }
}
