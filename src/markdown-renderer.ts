import MarkdownIt from 'markdown-it';

/**
 * 処理名: Mermaidフェンス描画拡張
 *
 * 処理概要: mermaidコードフェンスを <div class="mermaid"> に変換する
 *
 * 実装理由: 既存の古いプラグイン依存を除去しつつ、Mermaid描画機能を維持するため
 *
 * @param renderer - markdown-itインスタンス
 */
const registerMermaidFenceRenderer = (renderer: MarkdownIt): void => {
  const defaultFenceRenderer = renderer.renderer.rules.fence;

  /**
   * 処理名: フェンスレンダラー差し替え
   *
   * 処理概要: Mermaidフェンスのみ専用HTMLに変換し、それ以外は既定処理へ委譲する
   *
   * 実装理由: 既定のコードフェンス描画挙動を維持しながらMermaidのみ拡張するため
   *
   * @param tokens - Markdownトークン配列
   * @param index - 現在処理中のトークン位置
   * @param options - レンダリングオプション
   * @param environment - レンダリング時の環境情報
   * @param self - markdown-itのレンダラーインスタンス
   * @returns フェンス描画結果のHTML文字列
   */
  const fenceRenderer: NonNullable<MarkdownIt['renderer']['rules']['fence']> = (
    tokens,
    index,
    options,
    environment,
    self
  ) => {
    const token = tokens[index];
    const languageName = token.info.trim().split(/\s+/u)[0];

    if (languageName === 'mermaid') {
      return `<div class="mermaid">${token.content}</div>`;
    }

    if (defaultFenceRenderer !== undefined) {
      return defaultFenceRenderer(tokens, index, options, environment, self);
    }

    return self.renderToken(tokens, index, options);
  };

  renderer.renderer.rules.fence = fenceRenderer;
};

/**
 * 処理名: Markdownレンダラー生成
 *
 * 処理概要: markdown-it をMermaidフェンス対応で構成したレンダラーを作成する
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

  registerMermaidFenceRenderer(renderer);
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