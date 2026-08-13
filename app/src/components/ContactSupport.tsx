import "./ContactSupport.css";
import { useLanguage } from "../i18n/LanguageContext";

interface Props {
  onBack: () => void;
}

const APP_VERSION = "2.23.2";

function createInquiryHref(language: "ja" | "en"): string {
  const subject = language === "ja" ? "[Shoot Log] お問い合わせ" : "[Shoot Log] Support request";
  const body = language === "ja" ? `以下をご記入ください。不要な項目は削除して構いません。

【お問い合わせ種別】
ログイン／同期／アップデート／データ／不具合／要望／その他

【発生した日時】

【端末】
例：iPhone 15、MacBook

【ブラウザー】
例：Safari、Chrome、Edge

【操作手順・お問い合わせ内容】

【表示されたメッセージ】

【再現するか】

Shoot Log Version ${APP_VERSION}

※パスワード、認証メールのリンク、所持許可証番号などは記載しないでください。` : `Please complete the relevant fields.

[Request type]
Sign-in / Sync / Update / Data / Bug / Feature request / Other

[Date and time]

[Device]
e.g. iPhone 15, MacBook

[Browser]
e.g. Safari, Chrome, Edge

[Steps and description]

[Message displayed]

[Can it be reproduced?]

Shoot Log Version ${APP_VERSION}

Do not include passwords, authentication links, or firearm permit numbers.`;
  return `mailto:aliexadduser@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export default function ContactSupport({ onBack }: Props) {
  const { language, text } = useLanguage();
  return <article className="contact-support">
    <header>
      <div><p className="eyebrow">SUPPORT</p><h2>{text("お問い合わせ", "Contact support")}</h2><p>Shoot Log Version {APP_VERSION}</p></div>
      <button onClick={onBack}>{text("アカウント設定へ戻る", "Back to account")}</button>
    </header>

    <div className="contact-support-body">
      <section className="contact-primary">
        <div><h3>{text("メールで問い合わせる", "Contact by email")}</h3><p>{text("下のボタンを押すと、確認に必要な項目を入力したメール作成画面が開きます。", "The button opens an email draft containing the information needed for support.")}</p></div>
        <a className="contact-mail-button" href={createInquiryHref(language)}>{text("問い合わせメールを作成", "Create support email")}</a>
      </section>

      <section><h3>{text("お問い合わせ前にお試しください", "Try these first")}</h3><ul>
        <li>{text("ログインできない場合：「パスワードを忘れた場合」から再設定メールを送信する", "Cannot sign in: send a reset email from Forgot password.")}</li>
        <li>{text("データが最新でない場合：同じアカウントでログインし、「今すぐ同期」を押す", "Data not current: sign in to the same account and press Sync now.")}</li>
        <li>{text("画面が更新されない場合：更新通知からアップデートし、アプリを完全に閉じて開き直す", "App not updated: use the update notice, then fully close and reopen the app.")}</li>
        <li>{text("データ操作の前に：「バックアップ」から最新のJSONファイルを保存する", "Before changing data: save a current JSON backup.")}</li>
      </ul></section>

      <section><h3>{text("記載していただきたい内容", "What to include")}</h3><ul>
        <li>{text("使用している端末とブラウザー", "Device and browser")}</li>
        <li>{text("問題が発生した日時と、直前に行った操作", "Date, time, and action immediately before the issue")}</li>
        <li>{text("画面に表示されたメッセージを省略しない全文", "The complete message displayed")}</li>
        <li>{text("同じ操作で問題が再現するか", "Whether the same steps reproduce the issue")}</li>
        <li>{text("必要に応じて、個人情報を隠した画面のスクリーンショット", "If needed, a screenshot with personal information hidden")}</li>
      </ul></section>

      <section className="contact-warning"><h3>{text("送信しないでください", "Do not send")}</h3><p>{text("パスワード、認証メールやパスワード再設定メールのリンク、所持許可証番号、本人確認書類、クレジットカード情報などは送信しないでください。運営者がパスワードを尋ねることはありません。", "Do not send passwords, authentication or reset links, firearm permit numbers, identity documents, or payment information. The operator will never ask for your password.")}</p></section>

      <section><h3>{text("返信について", "Replies")}</h3><p>{text("個人運営のため、返信まで時間がかかる場合や、内容によって回答できない場合があります。返信が届かない場合は、迷惑メールフォルダーと受信設定をご確認ください。", "Shoot Log is independently operated, so replies may take time and some requests may not receive an answer. Check your spam folder and mail settings if no reply arrives.")}</p></section>

      <section className="contact-operator"><h3>{text("運営者", "Operator")}</h3><dl><div><dt>{text("運営者", "Operator")}</dt><dd>{text("ブログ「downhill62」管理人", "Administrator of the downhill62 blog")}</dd></div><div><dt>{text("ブログ", "Blog")}</dt><dd><a href="https://downhill62.hatenablog.com/" target="_blank" rel="noreferrer">https://downhill62.hatenablog.com/</a></dd></div></dl></section>
    </div>
  </article>;
}
