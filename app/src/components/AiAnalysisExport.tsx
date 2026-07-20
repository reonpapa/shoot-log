import { useState } from "react";
import type { StoredSession } from "../services/storage";
import { createAiAnalysisPrompt } from "../services/aiAnalysisExport";
import "./AiAnalysisExport.css";

export function AiAnalysisExport({ session }: { session: StoredSession }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const prompt = createAiAnalysisPrompt(session);
  const canShare = typeof navigator.share === "function";

  async function copy() {
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
  }

  async function share() {
    try {
      await navigator.share({ title: "Shoot Log AI分析用データ", text: prompt });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      await copy();
    }
  }

  function copyAndOpenChatGpt() {
    window.open("https://chatgpt.com/", "_blank", "noopener,noreferrer");
    void copy();
  }

  return <section className="ai-analysis-export"><header><div><p className="eyebrow">OPTIONAL AI ANALYSIS</p><h3>自分のAIで詳しく分析</h3><p>個人情報と自由記述を除いた分析用データを端末内で作成します。</p></div><button type="button" onClick={() => setOpen((current) => !current)}>{open ? "閉じる" : "AI分析用データを作成"}</button></header>{open && <div className="ai-analysis-export-body"><textarea aria-label="AI分析用データ" readOnly value={prompt} /><p>内容を確認してから、ご自身が契約している生成AIへ渡してください。AI側で内容を確認し、送信はご自身で行います。</p><div>{canShare ? <button className="primary-button" type="button" onClick={share}>AIアプリへ共有</button> : <button className="primary-button" type="button" onClick={copyAndOpenChatGpt}>{copied ? "コピー済み・ChatGPTを開きました" : "コピーしてChatGPTを開く"}</button>}<button type="button" onClick={copy}>{copied ? "コピーしました" : "分析用データをコピー"}</button></div><small>共有やコピーだけではAIへ送信されません。AIの回答は参考情報とし、射撃場の規則と安全指導を優先してください。</small></div>}</section>;
}
