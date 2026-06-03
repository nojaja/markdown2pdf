import fs from 'node:fs';
import path from 'node:path';

/**
 * 処理名: 描画タイムアウト例外
 *
 * 処理概要: レンダリング時間超過を表す例外
 *
 * 実装理由: 失敗分類を `RENDER_TIMEOUT` へ正規化するため
 */
export class RenderTimeoutError extends Error {
  /**
   * 処理名: コンストラクタ
   *
   * 処理概要: タイムアウト例外を初期化する
   *
   * 実装理由: 例外名を固定して判別しやすくするため
   *
   * @param message エラーメッセージ
   */
  public constructor(message: string) {
    super(message);
    this.name = 'RenderTimeoutError';
  }
}

/**
 * 処理名: PDF出力例外
 *
 * 処理概要: PDF出力失敗を表す例外
 *
 * 実装理由: 失敗分類を `PDF_WRITE` へ正規化するため
 */
export class PdfWriteError extends Error {
  /**
   * 処理名: コンストラクタ
   *
   * 処理概要: PDF出力例外を初期化する
   *
   * 実装理由: 例外名を固定して判別しやすくするため
   *
   * @param message エラーメッセージ
   */
  public constructor(message: string) {
    super(message);
    this.name = 'PdfWriteError';
  }
}

export interface PdfRenderer {
  renderHtmlToPdf(html: string, outputPath: string, options: PdfRenderOptions): Promise<void>;
}

export type PdfRenderOptions = {
  timeoutMs: number;
  format: 'A4' | 'Letter';
  landscape: boolean;
  scale: number;
  marginTop: string;
  marginRight: string;
  marginBottom: string;
  marginLeft: string;
};

const PUPPETEER_CORE_SPECIFIER = 'puppeteer-core';
type PuppeteerCoreModule = typeof import('puppeteer-core');

/**
 * 処理名: puppeteer-coreロード
 *
 * 処理概要: ESM専用のpuppeteer-coreを実行時に読み込む
 *
 * 実装理由: CommonJSビルドでrequire化されることを避けるため
 *
 * @returns puppeteer-core モジュール
 */
const loadPuppeteerCore = async (): Promise<PuppeteerCoreModule> => {
  const importer = new Function('specifier', 'return import(specifier)') as (
    specifier: string
  ) => Promise<PuppeteerCoreModule>;
  return importer(PUPPETEER_CORE_SPECIFIER);
};

/**
 * 処理名: Puppeteer PDFレンダラー
 *
 * 処理概要: ヘッドレスブラウザでHTMLを描画してPDFとして保存する
 *
 * 実装理由: Mermaid描画結果を含めたブラウザ相当のPDF出力を実現するため
 */
export class PuppeteerPdfRenderer implements PdfRenderer {
  /**
   * 処理名: コンストラクタ
   *
   * 処理概要: モジュールローダーを受け取りレンダラーを初期化する
   *
   * 実装理由: テスト時に puppeteer-core ロードを差し替え可能にするため
   *
   * @param puppeteerLoader puppeteer-coreローダー
   */
  public constructor(
    private readonly puppeteerLoader: () => Promise<PuppeteerCoreModule> = loadPuppeteerCore
  ) {}

  /**
   * 処理名: HTML PDF化
   *
   * 処理概要: HTMLを読み込んで描画完了を待機し、PDFを出力する
   *
   * 実装理由: CLIの通常実行時に各MarkdownをPDFへ変換するため
   *
   * @param html HTML全文
   * @param outputPath 出力PDFパス
   * @param options PDF描画オプション
   * @returns なし
   */
  public async renderHtmlToPdf(
    html: string,
    outputPath: string,
    options: PdfRenderOptions
  ): Promise<void> {
    const puppeteerModule = await this.puppeteerLoader();
    const puppeteer = puppeteerModule.default;

    const executablePath = resolveBrowserExecutablePath();
    if (executablePath === undefined) {
      throw new PdfWriteError(
        'ブラウザ実行ファイルが見つかりません。PUPPETEER_EXECUTABLE_PATH を設定してください。'
      );
    }

    const browser = await puppeteer.launch({
      executablePath,
      headless: true,
      args: ['--disable-gpu', '--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
      const page = await browser.newPage();
      await page.setContent(html, {
        waitUntil: 'load',
        timeout: options.timeoutMs
      });

      // Mermaid要素がある場合は描画完了を短時間待機する
      await page
        .waitForFunction(
          () => {
            const mermaidNodes = document.querySelectorAll('.mermaid');
            if (mermaidNodes.length === 0) {
              return true;
            }

            return Array.from(mermaidNodes).every((node) => {
              return node.querySelector('svg') !== null;
            });
          },
          {
            timeout: options.timeoutMs
          }
        )
        .catch(() => {
          // waitForFunction が失敗しても setContent 完了済みならPDF出力自体は試みる
        });

      await page.pdf({
        path: outputPath,
        printBackground: true,
        format: options.format,
        landscape: options.landscape,
        scale: options.scale,
        margin: {
          top: options.marginTop,
          right: options.marginRight,
          bottom: options.marginBottom,
          left: options.marginLeft
        }
      });
    } catch (error) {
      if (error instanceof puppeteerModule.TimeoutError) {
        throw new RenderTimeoutError('レンダリングがタイムアウトしました。');
      }

      if (error instanceof Error) {
        throw new PdfWriteError(error.message);
      }

      throw new PdfWriteError('PDF出力に失敗しました。');
    } finally {
      await browser.close();
    }
  }
}

/**
 * 処理名: ブラウザ実行ファイル探索
 *
 * 処理概要: Puppeteer起動に使うブラウザ実行ファイルパスを探索する
 *
 * 実装理由: OS依存の既定パスと環境変数指定の両方に対応するため
 *
 * @returns 実行ファイルパス
 */
const resolveBrowserExecutablePath = (): string | undefined => {
  const candidates = [
    process.env.PUPPETEER_EXECUTABLE_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
  ].filter((candidate): candidate is string => candidate !== undefined && candidate.length > 0);

  return candidates.find((candidate) => fs.existsSync(path.normalize(candidate)));
};

export const defaultPdfRenderer = new PuppeteerPdfRenderer();