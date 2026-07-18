import "./ContactSupport.css";

interface Props {
  onBack: () => void;
}

const APP_VERSION = "2.6.0";

function createInquiryHref(): string {
  const subject = "[Shoot Log] お問い合わせ";
  const body = `以下をご記入ください。不要な項目は削除して構いません。

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

※パスワード、認証メールのリンク、所持許可証番号などは記載しないでください。`;
  return `mailto:reonpapa@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export default function ContactSupport({ onBack }: Props) {
  return <article className="contact-support">
    <header>
      <div><p className="eyebrow">SUPPORT</p><h2>お問い合わせ</h2><p>Shoot Log Version {APP_VERSION}</p></div>
      <button onClick={onBack}>アカウント設定へ戻る</button>
    </header>

    <div className="contact-support-body">
      <section className="contact-primary">
        <div><h3>メールで問い合わせる</h3><p>下のボタンを押すと、確認に必要な項目を入力したメール作成画面が開きます。</p></div>
        <a className="contact-mail-button" href={createInquiryHref()}>問い合わせメールを作成</a>
        <p>送信先：<a href="mailto:reonpapa@gmail.com">reonpapa@gmail.com</a></p>
      </section>

      <section><h3>お問い合わせ前にお試しください</h3><ul>
        <li>ログインできない場合：「パスワードを忘れた場合」から再設定メールを送信する</li>
        <li>データが最新でない場合：同じアカウントでログインし、「今すぐ同期」を押す</li>
        <li>画面が更新されない場合：更新通知からアップデートし、アプリを完全に閉じて開き直す</li>
        <li>データ操作の前に：「バックアップ」から最新のJSONファイルを保存する</li>
      </ul></section>

      <section><h3>記載していただきたい内容</h3><ul>
        <li>使用している端末とブラウザー</li>
        <li>問題が発生した日時と、直前に行った操作</li>
        <li>画面に表示されたメッセージを省略しない全文</li>
        <li>同じ操作で問題が再現するか</li>
        <li>必要に応じて、個人情報を隠した画面のスクリーンショット</li>
      </ul></section>

      <section className="contact-warning"><h3>送信しないでください</h3><p>パスワード、認証メールやパスワード再設定メールのリンク、所持許可証番号、本人確認書類、クレジットカード情報などは送信しないでください。運営者がパスワードを尋ねることはありません。</p></section>

      <section><h3>返信について</h3><p>個人運営のため、返信まで時間がかかる場合や、内容によって回答できない場合があります。返信が届かない場合は、迷惑メールフォルダーと受信設定をご確認ください。</p></section>

      <section className="contact-operator"><h3>運営者</h3><dl><div><dt>運営者</dt><dd>ブログ「downhill62」管理人</dd></div><div><dt>ブログ</dt><dd><a href="https://downhill62.hatenablog.com/" target="_blank" rel="noreferrer">https://downhill62.hatenablog.com/</a></dd></div></dl></section>
    </div>
  </article>;
}
