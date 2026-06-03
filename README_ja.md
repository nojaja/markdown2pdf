# mermaid-md-pdf-cli

`mermaid-md-pdf-cli` は、Markdown ファイルを PDF に変換する CLI ツールです。Mermaid 図表もヘッドレスブラウザ経由で描画して出力できます。

`npx` で使う人は、まず下の使い方を見てください。

AI エージェントが使う場合は、`--help-format json` と `--report-format json` を優先すると、引数と結果を機械的に理解しやすくなります。

## 使い方

`npx` から CLI を実行します。

```bash
npx mermaid-md-pdf-cli --help
```


Markdown ファイル 1 つを PDF に変換します。

```bash
npx mermaid-md-pdf-cli --input sample/Gantt_Sample.md --output sample/Gantt_Sample.pdf
```

ディレクトリ配下の Markdown をまとめて変換し、相対パス構造を保ちます。

```bash
npx mermaid-md-pdf-cli --input docs --output dist
```

PDF を書き出さず、変換計画だけを出力します。

```bash
npx mermaid-md-pdf-cli --input docs --plan --report-format json
```

## AI エージェント向け

人間向けの説明を読まずに利用方法を把握したい場合は、JSON 出力を使ってください。

- `--help-format json`: コマンド定義、型、既定値、制約を JSON で返します。
- `--report-format json`: 実行結果を機械可読に返します。
- `--plan`: PDF を生成せず、対象ファイルと出力先だけを返します。

推奨フロー:

```bash
npx mermaid-md-pdf-cli --help-format json
npx mermaid-md-pdf-cli --input docs --plan --report-format json
npx mermaid-md-pdf-cli --input docs --report-format json
```

## インストール

```bash
npm install
npm run build
```

build 済みの `dist` を直接使って変換する場合は、次のコマンドを実行します。

```bash
node ./dist/src/index.js --input sample/Gantt_Sample.md --output sample/Gantt_Sample.pdf
```

## 設定

CLI では次のオプションを利用できます。

- `--input <path>`: 変換対象の Markdown ファイルまたはディレクトリ。必須。
- `--output <path>`: 出力先の PDF ファイルまたはディレクトリ。
- `--plan`: PDF を生成せず、変換計画だけを出力します。
- `--report-format <text|json>`: レポート形式を選びます。
- `--help-format <text|json>`: ヘルプを JSON 形式で出力します。
- `--timeout <ms>`: PDF 描画タイムアウト。既定値は `30000`。
- `--format <A4|Letter>`: 用紙サイズ。既定値は `A4`。
- `--landscape`: 横向きで PDF を出力します。
- `--scale <number>`: ページスケール。既定値は `1`。
- `--margin-top`, `--margin-right`, `--margin-bottom`, `--margin-left`: CSS の余白値。既定値は `10mm`。

短縮形も利用できます。

- `-i`: `--input`
- `-o`: `--output`
- `-p`: `--plan`
- `-r`: `--report-format`
- `-j`: `--help-format`
- `-t`: `--timeout`
- `-f`: `--format`
- `-l`: `--landscape`
- `-s`: `--scale`

特定のブラウザ実行ファイルを使う必要がある場合は、`PUPPETEER_EXECUTABLE_PATH` を設定してください。

Mermaid 図表は描画時に jsDelivr CDN から読み込まれるため、Mermaid を含む文書を変換する場合はネットワーク接続が必要です。

## 例

リポジトリに含まれるサンプルを使って動作確認できます。

```bash
npx mermaid-md-pdf-cli --input sample/Gantt_Sample.md --output sample/Gantt_Sample.pdf
```

ディレクトリ入力では、出力先は元のディレクトリ構造を維持します。既定では `<input>/_pdf/` 配下に書き出されます。

## サポート

TODO: ここに issue トラッカー、議論フォーラム、またはメンテナ連絡先を追加してください。

## 貢献

貢献を歓迎します。

- 変更提案は issue の作成または pull request でお願いします。
- 送信前に次の検証を実行してください。

```bash
npm test
npm run test:e2e
npm run lint
npm run type-check
```

## ライセンス

ライセンス条件は [LICENSE](LICENSE) を参照してください。