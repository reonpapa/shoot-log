import "./OperationManual.css";

const MANUAL_URL = `${import.meta.env.BASE_URL}manuals/shoot-log-operation-manual.pdf`;

export function OperationManual() {
  return <section className="operation-manual">
    <div className="operation-manual-heading">
      <div>
        <span>OPERATION MANUAL</span>
        <h3>操作マニュアル</h3>
        <p>インストールから射撃入力、分析、実包管理、バックアップまでを画像付きで説明します。</p>
      </div>
      <strong>PDF・全16ページ</strong>
    </div>
    <a className="operation-manual-download" href={MANUAL_URL} download="shoot-log-v2.7.4-operation-manual.pdf" target="_blank" rel="noreferrer">
      <span>操作マニュアルをダウンロード</span>
      <small>Version 2.7.4対応</small>
    </a>
    <p className="operation-manual-note">iPhoneではPDFを開いたあと、共有ボタンから「ファイルに保存」を選ぶと端末へ保存できます。</p>
  </section>;
}
