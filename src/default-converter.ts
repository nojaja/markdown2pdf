import path from 'node:path';
import fs from 'node:fs';

import {
  defaultFileSystemWrapper,
  type FileSystemWrapper
} from './file-system-wrapper';
import { renderMarkdownToHtml } from './markdown-renderer';
import { defaultPdfRenderer, type PdfRenderOptions, type PdfRenderer } from './pdf-renderer';

export type Converter = (source: string, output: string, options: PdfRenderOptions) => Promise<void>;
type MermaidScriptLoader = () => string;

/**
 * 処理名: 既定コンバーター生成
 *
 * 処理概要: Markdown読込からPDF出力までの標準変換フローを返す
 *
 * 実装理由: CLIの通常実行で利用する変換ロジックを差し替え可能に保つため
 *
 * @param fileSystem ファイルシステムラッパー
 * @param pdfRenderer PDFレンダラー
 * @param mermaidScriptLoader Mermaidスクリプト取得関数
 * @returns 変換関数
 */
export const createDefaultConverter = (
  fileSystem: FileSystemWrapper = defaultFileSystemWrapper,
  pdfRenderer: PdfRenderer = defaultPdfRenderer,
  mermaidScriptLoader: MermaidScriptLoader = loadBundledMermaidScript
): Converter => {
  const mermaidScript = mermaidScriptLoader();

  return async (source: string, output: string, options: PdfRenderOptions): Promise<void> => {
    const markdown = fileSystem.readTextFile(source);
    const bodyHtml = renderMarkdownToHtml(markdown);
    const html = buildHtmlDocument(bodyHtml, mermaidScript);

    fileSystem.ensureDirectory(path.dirname(output));
    await pdfRenderer.renderHtmlToPdf(html, output, options);
  };
};

/**
 * 処理名: HTML文書構築
 *
 * 処理概要: Markdown本文HTMLをPDF描画用の完全なHTML文書へラップする
 *
 * 実装理由: CSSとMermaid初期化スクリプトを毎回同一条件で適用するため
 *
 * @param bodyHtml Markdown本文HTML
 * @param mermaidScript Mermaid本体のスクリプト文字列
 * @returns HTML全文
 */
const buildHtmlDocument = (bodyHtml: string, mermaidScript: string): string => {
  return `<!doctype html>
<html lang="ja">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      body {
        font-family: "Yu Gothic", "Meiryo", sans-serif;
        line-height: 1.6;
        padding: 24px;
        color: #222;
      }

      pre {
        background: #f5f5f5;
        padding: 12px;
        border-radius: 6px;
        overflow-x: auto;
      }

      code {
        font-family: Consolas, "Courier New", monospace;
      }

      .mermaid {
        text-align: center;
      }
    </style>
    <script>
      ${mermaidScript}
    </script>
    <script>
      mermaid.initialize({ startOnLoad: true });
    </script>
  </head>
  <body>
    ${bodyHtml}
  </body>
</html>`;
};

/**
 * 処理名: 同梱Mermaid読込
 *
 * 処理概要: npm依存として同梱されたMermaid本体スクリプトを読込む
 *
 * 実装理由: 変換時に外部ネットワークアクセスを不要化するため
 *
 * @returns Mermaid本体のスクリプト文字列
 */
const loadBundledMermaidScript = (): string => {
  const mermaidScriptPath = require.resolve('mermaid/dist/mermaid.min.js');
  return fs.readFileSync(mermaidScriptPath, 'utf-8');
};