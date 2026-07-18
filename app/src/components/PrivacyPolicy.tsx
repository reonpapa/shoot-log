import "./PrivacyPolicy.css";

interface Props {
  onBack: () => void;
}

export default function PrivacyPolicy({ onBack }: Props) {
  return <article className="privacy-policy">
    <header>
      <div><p className="eyebrow">PRIVACY POLICY</p><h2>プライバシーポリシー</h2><p>制定日：2026年7月19日</p></div>
      <button onClick={onBack}>アカウント設定へ戻る</button>
    </header>

    <div className="privacy-policy-body">
      <p>ブログ「downhill62」管理人（以下「運営者」）は、クレー射撃分析アプリ「Shoot Log」（以下「本サービス」）における利用者情報を、以下の方針に基づいて取り扱います。</p>

      <section><h3>1. 取得・保存する情報</h3><p>本サービスでは、次の情報を取得または保存します。</p><ul>
        <li>アカウント情報：メールアドレス、認証用ユーザーID、登録・確認・ログインに関する日時</li>
        <li>利用者が入力した情報：射撃記録、スコア、射撃場、使用実包、天候、使用銃、振り返り、実包管理、所持許可および使用銃に関する登録内容</li>
        <li>技術情報：認証セッション、同期日時、クラウドデータの更新情報、サービス提供事業者が記録するIPアドレス、ブラウザー・端末情報、アクセスログおよびエラーログ</li>
        <li>問い合わせ情報：問い合わせ時に提供されたメールアドレスおよび問い合わせ内容</li>
      </ul><p>パスワードは認証サービスにより保護され、運営者が内容を確認することはできません。</p></section>

      <section><h3>2. 利用目的</h3><p>取得した情報は、次の目的で利用します。</p><ul>
        <li>本サービスの本人認証、データ保存、端末間同期および各種分析機能の提供</li>
        <li>問い合わせ対応、障害調査、サービス改善および重要なお知らせ</li>
        <li>不正利用の防止、セキュリティ確保および利用状況の確認</li>
        <li>法令または公的機関からの適法な要請への対応</li>
      </ul></section>

      <section><h3>3. 端末内保存とクラウド保存</h3><ul>
        <li>入力内容は、操作中の端末・ブラウザーのLocalStorageへ即時保存されます。</li>
        <li>ログイン中は、同じアカウントの端末間同期を行うためSupabaseへ保存されます。</li>
        <li>利用者が出力したJSONバックアップおよびPDFは、利用者自身が選択した保存先で管理されます。</li>
        <li>ログアウトしても端末内データは直ちには削除されませんが、ログアウト中はアプリ画面から表示できないよう制限しています。</li>
      </ul></section>

      <section><h3>4. 外部サービス</h3><p>本サービスは、提供に必要な範囲で次の外部サービスを利用します。</p><ul>
        <li><a href="https://supabase.com/privacy" target="_blank" rel="noreferrer">Supabase</a>：ユーザー認証、クラウドデータベースおよび同期</li>
        <li><a href="https://docs.github.com/ja/site-policy/privacy-policies/github-general-privacy-statement" target="_blank" rel="noreferrer">GitHub Pages</a>：アプリの公開・配信</li>
        <li><a href="https://policies.google.com/privacy?hl=ja" target="_blank" rel="noreferrer">Google</a>：認証メールの送信および問い合わせメールの受信</li>
      </ul><p>これらの事業者において、情報が日本国外で処理または保存される場合があります。運営者は各事業者の契約、プライバシー情報および安全管理状況を確認し、必要な範囲で利用します。</p></section>

      <section><h3>5. 第三者提供</h3><p>運営者は、次の場合を除き、利用者の個人情報を第三者へ販売または提供しません。</p><ul>
        <li>利用者本人の同意がある場合</li>
        <li>本サービスの運営に必要な範囲で外部サービス事業者へ処理を委託する場合</li>
        <li>法令に基づく場合、または生命・身体・財産の保護に必要な場合</li>
      </ul></section>

      <section><h3>6. 安全管理</h3><p>本サービスでは、HTTPS通信、Supabase Authによる認証、Row Level Securityによるアカウント単位のアクセス制御、権限を限定した公開キーの使用など、情報の漏えい、滅失または毀損を防止するための合理的な安全管理措置を講じます。運営者がクラウド上の記録を確認するのは、問い合わせ対応、障害調査、保安対応その他サービス運営上必要な場合に限ります。</p></section>

      <section><h3>7. 保存期間と削除</h3><ul>
        <li>クラウド上の情報は、アカウントが存続する間、または本サービスの提供に必要な期間保存します。</li>
        <li>アプリの「アカウントを削除」から、認証アカウントとクラウド上の同期データを削除できます。</li>
        <li>アカウント削除後も端末内のLocalStorage、利用者が保存したJSONおよびPDFは自動削除されません。不要な場合は、利用者自身でブラウザーのサイトデータまたは保存ファイルを削除してください。</li>
        <li>外部サービスのログやバックアップは、各事業者の保持方針に従って一定期間残る場合があります。</li>
      </ul></section>

      <section><h3>8. 開示・訂正・削除等</h3><p>利用者は、本サービス上で自身の登録内容を確認・修正・削除できます。アカウント情報に関する開示、訂正、利用停止その他の希望は、下記問い合わせ先へご連絡ください。本人確認のため、登録メールアドレスからの連絡などをお願いする場合があります。</p></section>

      <section><h3>9. 未成年者の利用</h3><p>未成年者が本サービスを利用する場合は、保護者など法定代理人の同意を得てください。</p></section>

      <section><h3>10. 本ポリシーの変更</h3><p>サービス内容や法令等の変更に応じて、本ポリシーを改定することがあります。重要な変更は、本サービス内その他適切な方法でお知らせします。</p></section>

      <section className="privacy-contact"><h3>11. 運営者・問い合わせ先</h3><dl><div><dt>運営者</dt><dd><a href="https://downhill62.hatenablog.com/" target="_blank" rel="noreferrer">ブログ「downhill62」管理人</a></dd></div><div><dt>メール</dt><dd><a href="mailto:reonpapa@gmail.com">reonpapa@gmail.com</a></dd></div></dl></section>
    </div>
  </article>;
}
