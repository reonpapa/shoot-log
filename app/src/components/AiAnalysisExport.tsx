import { useEffect, useRef, useState } from "react";
import type { StoredSession } from "../services/storage";
import { createAiAnalysisPrompt } from "../services/aiAnalysisExport";
import "./AiAnalysisExport.css";
import { useLanguage } from "../i18n/LanguageContext";

export function AiAnalysisExport({ session, initiallyOpen = false }: { session: StoredSession; initiallyOpen?: boolean }) {
  const { text } = useLanguage();
  const [open, setOpen] = useState(initiallyOpen);
  const [copyFeedback, setCopyFeedback] = useState<"chatgpt" | "copy" | null>(null);
  const feedbackTimer = useRef<number | undefined>(undefined);
  const prompt = createAiAnalysisPrompt(session);

  useEffect(() => () => window.clearTimeout(feedbackTimer.current), []);

  function showCopyFeedback(target: "chatgpt" | "copy") {
    window.clearTimeout(feedbackTimer.current);
    setCopyFeedback(target);
    feedbackTimer.current = window.setTimeout(() => setCopyFeedback(null), 2500);
  }

  async function copy(target: "chatgpt" | "copy") {
    await navigator.clipboard.writeText(prompt);
    showCopyFeedback(target);
  }

  async function copyAndOpenChatGpt() {
    await copy("chatgpt");
    window.open("https://chatgpt.com/", "_blank", "noopener,noreferrer");
  }

  return <section className="ai-analysis-export"><header><div><p className="eyebrow">OPTIONAL AI ANALYSIS</p><h3>{text("自分のAIで詳しく分析", "Analyze with your AI")}</h3><p>{text("個人情報を除き、ご自身の振り返りを含む分析用データを端末内で作成します。", "Creates analysis data on this device, including your review but excluding personal information.")}</p></div><button type="button" onClick={() => setOpen((current) => !current)}>{open ? text("閉じる", "Close") : text("AI分析用データを作成", "Create AI analysis data")}</button></header>{open && <div className="ai-analysis-export-body"><textarea aria-label={text("AI分析用データ", "AI analysis data")} readOnly value={prompt} /><p>{text("内容を確認してから、ご自身が契約している生成AIへ渡してください。AI側で内容を確認し、送信はご自身で行います。", "Review the content before giving it to your generative AI service. You remain in control of sending it.")}</p><div><button className="primary-button" type="button" onClick={() => void copyAndOpenChatGpt()}>{copyFeedback === "chatgpt" ? text("コピーしました", "Copied") : text("コピーしてChatGPTを開く", "Copy and open ChatGPT")}</button><button type="button" onClick={() => void copy("copy")}>{copyFeedback === "copy" ? text("コピーしました", "Copied") : text("分析用データをコピー", "Copy analysis data")}</button></div><small>{text("コピーだけではAIへ送信されません。ChatGPTで貼り付け内容を確認し、ご自身で送信してください。AIの回答は参考情報とし、射撃場の規則と安全指導を優先してください。", "Copying does not send data to an AI. Review and send it yourself. Treat AI responses as reference only; always follow range rules and safety instruction.")}</small></div>}</section>;
}
