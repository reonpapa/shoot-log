import { useState } from "react";
import type { StoredSession } from "../services/storage";
import { createAiAnalysisPrompt } from "../services/aiAnalysisExport";
import "./AiAnalysisExport.css";

export function AiAnalysisExport({ session }: { session: StoredSession }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const prompt = createAiAnalysisPrompt(session);

  async function copy() {
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
  }

  return <section className="ai-analysis-export"><header><div><p className="eyebrow">OPTIONAL AI ANALYSIS</p><h3>自分のAIで詳しく分析</h3><p>個人情報と自由記述を除いた分析用データを端末内で作成します。</p></div><button type="button" onClick={() => setOpen((current) => !current)}>{open ? "閉じる" : "AI分析用データを作成"}</button></header>{open && <div className="ai-analysis-export-body"><textarea aria-label="AI分析用データ" readOnly value={prompt} /><p>内容を確認してコピーし、ご自身が契約している生成AIへ貼り付けてください。自動送信は行いません。</p><div><button className="primary-button" type="button" onClick={copy}>{copied ? "コピーしました" : "分析用データをコピー"}</button><a href="https://chatgpt.com/" target="_blank" rel="noreferrer">ChatGPTを開く</a></div><small>AIの回答は参考情報です。射撃場の規則と安全指導を優先してください。</small></div>}</section>;
}
