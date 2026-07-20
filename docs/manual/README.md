# Shoot Log 操作マニュアル

マニュアル撮影モードは実際のReactコンポーネントとCSSをスマートフォン幅で表示し、長い画面の必要箇所へ自動スクロールして撮影します。表示例には架空データだけを使用し、通常のアプリ画面から撮影モードを開くことはできません。

## 実画面の撮影とPDF生成

MacへGoogle Chromeがインストールされている状態で実行します。

```bash
cd app
npm run manual:build
```

19箇所の画面画像を `docs/manual/screenshots/generated` へ保存し、実画面入りPDFを `app/public/manuals/shoot-log-operation-manual.pdf` へ生成します。

Chromeを標準以外の場所へインストールしている場合は、`CHROME_PATH` へChrome本体のパスを指定します。

## 従来のPDF生成

実画面の自動撮影ができない環境では、文章中心の暫定版を生成できます。

```bash
python3 docs/manual/generate_operation_manual.py
```

生成先は `app/public/manuals/shoot-log-operation-manual.pdf` です。

日本語フォントには Noto Sans JP を使用しています。ライセンスは `fonts/LICENSE-NotoSansJP.txt` を参照してください。
