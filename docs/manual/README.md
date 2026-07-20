# Shoot Log 操作マニュアル

`generate_operation_manual.py` は、現行仕様の操作マニュアルを生成します。実画面と一致しない模擬画面は掲載せず、確認済みの実画面画像だけを `screenshots` から使用します。表示例には説明用のデータだけを使用しています。

```bash
python3 docs/manual/generate_operation_manual.py
```

生成先は `app/public/manuals/shoot-log-operation-manual.pdf` です。

日本語フォントには Noto Sans JP を使用しています。ライセンスは `fonts/LICENSE-NotoSansJP.txt` を参照してください。
