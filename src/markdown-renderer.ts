import MarkdownIt from 'markdown-it';
import markdownItMermaid from 'markdown-it-mermaid';

/**
 * 処理名: Markdownレンダラー生成
 *
 * 処理概要: markdown-it と markdown-it-mermaid を組み合わせたレンダラーを作成する
 *
 * 実装理由: Mermaid記法を含むMarkdownをHTMLへ一貫変換するため
 *
 * @returns 構成済みMarkdownレンダラー
 */
const createMarkdownRenderer = (): MarkdownIt => {
  const renderer = new MarkdownIt({
    html: true,
    linkify: true,
    breaks: true
  });

  renderer.use(markdownItMermaid as unknown as (md: unknown) => void);
  return renderer;
};

const markdownRenderer = createMarkdownRenderer();

/**
 * 処理名: Markdown HTML変換
 *
 * 処理概要: Markdown本文をHTML文字列に変換する
 *
 * 実装理由: CLIの変換処理でHTMLテンプレート合成前の本文生成に利用するため
 *
 * @param markdown Markdown本文
 * @returns 変換済みHTML
 */
export const renderMarkdownToHtml = (markdown: string): string => {
  return markdownRenderer.render(markdown);
};