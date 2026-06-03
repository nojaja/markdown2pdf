import path from 'node:path';

import {
  defaultFileSystemWrapper,
  type FileSystemWrapper
} from './file-system-wrapper';
import { renderMarkdownToHtml } from './markdown-renderer';
import { defaultPdfRenderer, type PdfRenderOptions, type PdfRenderer } from './pdf-renderer';

export type Converter = (source: string, output: string, options: PdfRenderOptions) => Promise<void>;

/**
 * 処理名: 既定コンバーター生成
 *
 * 処理概要: Markdown読込からPDF出力までの標準変換フローを返す
 *
 * 実装理由: CLIの通常実行で利用する変換ロジックを差し替え可能に保つため
 *
 * @param fileSystem ファイルシステムラッパー
 * @param pdfRenderer PDFレンダラー
 * @returns 変換関数
 */
export const createDefaultConverter = (
  fileSystem: FileSystemWrapper = defaultFileSystemWrapper,
  pdfRenderer: PdfRenderer = defaultPdfRenderer
): Converter => {
  return async (source: string, output: string, options: PdfRenderOptions): Promise<void> => {
    const markdown = fileSystem.readTextFile(source);
    const bodyHtml = renderMarkdownToHtml(markdown);
    const html = buildHtmlDocument(bodyHtml);

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
 * @returns HTML全文
 */
const buildHtmlDocument = (bodyHtml: string): string => {
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
    <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
    <script>
      mermaid.initialize({ startOnLoad: true });
    </script>
  </head>
  <body>
    ${bodyHtml}
  </body>
</html>`;
};