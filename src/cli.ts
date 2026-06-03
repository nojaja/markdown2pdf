import path from 'node:path';

import { Command } from 'commander';

import { planConversions } from './conversion-planner';
import { createDefaultConverter, type Converter } from './default-converter';
import { defaultFileSystemWrapper, type FileSystemWrapper } from './file-system-wrapper';
import { discoverMarkdownFiles } from './markdown-discovery';
import { PdfWriteError, RenderTimeoutError, type PdfRenderOptions } from './pdf-renderer';

type CliOptions = {
  input: string;
  output?: string;
  plan: boolean;
  reportFormat: 'text' | 'json';
  helpFormat: 'text' | 'json';
  timeout: string;
  format: 'A4' | 'Letter';
  landscape: boolean;
  scale: string;
  marginTop: string;
  marginRight: string;
  marginBottom: string;
  marginLeft: string;
};

type FailureCode =
  | 'INPUT_VALIDATION'
  | 'MARKDOWN_RENDER'
  | 'RENDER_TIMEOUT'
  | 'PDF_WRITE'
  | 'UNEXPECTED';

type CliDependencies = {
  fileSystem: FileSystemWrapper;
  converter: Converter;
};

type PlanReport = {
  schemaVersion: '1.0';
  summary: {
    targets: number;
    success: number;
    failed: number;
    exitCode: number;
  };
  outputs: Array<{
    source: string;
    output: string;
  }>;
  failures: Array<{
    source: string;
    code: FailureCode;
    message: string;
  }>;
};

/**
 * 処理名: CLI実行
 *
 * 処理概要: 引数を解析し、計画モードまたは変換モードを実行する
 *
 * 実装理由: CLIの制御フローを1箇所に集約し、テストと将来拡張を容易にするため
 *
 * @param argv CLI引数
 * @param writeStdout 標準出力書き込み
 * @param writeStderr 標準エラー出力書き込み
 * @param dependencies 依存注入（テスト/差し替え用）
 * @returns 終了コード
 */
export const runCli = async (
  argv: string[],
  writeStdout: (content: string) => void,
  writeStderr: (content: string) => void,
  dependencies?: Partial<CliDependencies>
): Promise<number> => {
  const fileSystem = dependencies?.fileSystem ?? defaultFileSystemWrapper;
  const converter = dependencies?.converter ?? createDefaultConverter(fileSystem);

  const program = new Command();

  program
    .name('mermaid-md-pdf-cli')
    .requiredOption('-i, --input <path>')
    .option('-o, --output <path>')
    .option('-p, --plan')
    .option('-r, --report-format <format>', 'text|json', 'text')
    .option('-j, --help-format <format>', 'text|json', 'text')
    .option('-t, --timeout <ms>', 'PDF描画タイムアウト(ms)', '30000')
    .option('-f, --format <paper>', 'A4|Letter', 'A4')
    .option('-l, --landscape', '横向きでPDF出力')
    .option('-s, --scale <number>', '0.1-2.0', '1')
    .option('--margin-top <cssLength>', '例: 10mm', '10mm')
    .option('--margin-right <cssLength>', '例: 10mm', '10mm')
    .option('--margin-bottom <cssLength>', '例: 10mm', '10mm')
    .option('--margin-left <cssLength>', '例: 10mm', '10mm')
    .showHelpAfterError();

  try {
    program.parse(argv, { from: 'user' });
  } catch (error) {
    writeStderr(String(error));
    return 2;
  }

  const options = program.opts<CliOptions>();

  if (options.helpFormat === 'json') {
    writeStdout(`${JSON.stringify(buildHelpJson(), null, 2)}\n`);
    return 0;
  }

  const discovery = discoverTargets(options.input, fileSystem);
  if (discovery.errorMessage !== undefined) {
    const report = buildFailureReport(discovery.errorMessage);
    emitReport(options.reportFormat, report, writeStdout, writeStderr);
    return 2;
  }

  const plan = planConversions({
    inputPath: options.input,
    outputPath: options.output,
    markdownFiles: discovery.markdownFiles
  });

  const timeoutMs = Number(options.timeout);
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    const report = buildFailureReport('INPUT_VALIDATION: --timeout は正の整数で指定してください。');
    emitReport(options.reportFormat, report, writeStdout, writeStderr);
    return 2;
  }

  const renderOptions = buildRenderOptions(options, timeoutMs);
  if ('errorMessage' in renderOptions) {
    const report = buildFailureReport(renderOptions.errorMessage);
    emitReport(options.reportFormat, report, writeStdout, writeStderr);
    return 2;
  }

  if (options.plan) {
    const report: PlanReport = {
      schemaVersion: '1.0',
      summary: {
        targets: plan.length,
        success: plan.length,
        failed: 0,
        exitCode: 0
      },
      outputs: plan,
      failures: []
    };

    emitReport(options.reportFormat, report, writeStdout, writeStderr);
    return 0;
  }

  const conversionResult = await runConversions(plan, converter, renderOptions);
  const exitCode = resolveExitCode(conversionResult.outputs.length, conversionResult.failures);

  const report: PlanReport = {
    schemaVersion: '1.0',
    summary: {
      targets: plan.length,
      success: conversionResult.outputs.length,
      failed: conversionResult.failures.length,
      exitCode
    },
    outputs: conversionResult.outputs,
    failures: conversionResult.failures
  };

  emitReport(options.reportFormat, report, writeStdout, writeStderr);
  return exitCode;
};

/**
 * 処理名: レポート出力
 *
 * 処理概要: 指定フォーマットに応じて標準出力/標準エラーへ結果を出力する
 *
 * 実装理由: text/json の出力戦略を分離してCLI本体の見通しを維持するため
 *
 * @param format 出力フォーマット
 * @param report 出力するレポート
 * @param writeStdout 標準出力書き込み
 * @param writeStderr 標準エラー出力書き込み
 * @returns なし
 */
const emitReport = (
  format: 'text' | 'json',
  report: PlanReport,
  writeStdout: (content: string) => void,
  writeStderr: (content: string) => void
): void => {
  if (format === 'json') {
    writeStdout(`${JSON.stringify(report, null, 2)}\n`);
    return;
  }

  writeStdout(
    `targets=${report.summary.targets} success=${report.summary.success} failed=${report.summary.failed} exitCode=${report.summary.exitCode}\n`
  );

  for (const failure of report.failures) {
    writeStderr(`${failure.code}: ${failure.message}\n`);
  }
};

/**
 * 処理名: 変換対象探索
 *
 * 処理概要: 入力パスから変換対象のMarkdown一覧を解決する
 *
 * 実装理由: 入力検証を独立させ、失敗時のエラー分類を固定化するため
 *
 * @param inputPath 入力パス
 * @param fileSystem ファイルシステムラッパー
 * @returns 探索結果
 */
const discoverTargets = (
  inputPath: string,
  fileSystem: FileSystemWrapper
): { markdownFiles: string[]; errorMessage?: string } => {
  let stat;
  try {
    stat = fileSystem.statPath(inputPath);
  } catch {
    return {
      markdownFiles: [],
      errorMessage: `INPUT_VALIDATION: 入力パスが存在しません: ${inputPath}`
    };
  }

  if (stat.isFile) {
    if (path.extname(inputPath).toLowerCase() !== '.md') {
      return {
        markdownFiles: [],
        errorMessage: `INPUT_VALIDATION: 入力ファイルは .md のみ指定可能です: ${inputPath}`
      };
    }

    return { markdownFiles: [inputPath] };
  }

  if (!stat.isDirectory) {
    return {
      markdownFiles: [],
      errorMessage: `INPUT_VALIDATION: 入力パスはファイルまたはフォルダである必要があります: ${inputPath}`
    };
  }

  const markdownFiles = discoverMarkdownFiles(inputPath, fileSystem);
  if (markdownFiles.length === 0) {
    return {
      markdownFiles: [],
      errorMessage: `INPUT_VALIDATION: 入力フォルダに Markdown が存在しません: ${inputPath}`
    };
  }

  return { markdownFiles };
};

/**
 * 処理名: 失敗レポート生成
 *
 * 処理概要: 入力検証失敗時の標準レポートを生成する
 *
 * 実装理由: エラー時の出力形式を一定に保つため
 *
 * @param message エラーメッセージ
 * @returns 失敗レポート
 */
const buildFailureReport = (message: string): PlanReport => {
  return {
    schemaVersion: '1.0',
    summary: {
      targets: 0,
      success: 0,
      failed: 1,
      exitCode: 2
    },
    outputs: [],
    failures: [
      {
        source: '',
        code: 'INPUT_VALIDATION',
        message
      }
    ]
  };
};

/**
 * 処理名: ヘルプJSON生成
 *
 * 処理概要: AIエージェント向けの機械可読ヘルプ情報を返す
 *
 * 実装理由: textヘルプ以外に安定した引数スキーマを提供するため
 *
 * @returns ヘルプJSONオブジェクト
 */
const buildHelpJson = (): unknown => {
  return {
    command: 'md2pdf',
    options: [
      {
        name: '-i, --input <path>',
        required: true,
        type: 'string'
      },
      {
        name: '-o, --output <path>',
        required: false,
        type: 'string'
      },
      {
        name: '-p, --plan',
        required: false,
        type: 'boolean'
      },
      {
        name: '-r, --report-format <format>',
        required: false,
        type: 'text|json',
        default: 'text'
      },
      {
        name: '-j, --help-format <format>',
        required: false,
        type: 'text|json',
        default: 'text'
      },
      {
        name: '-t, --timeout <ms>',
        required: false,
        type: 'number',
        default: '30000'
      }
    ]
  };
};

/**
 * 処理名: 変換実行
 *
 * 処理概要: 計画された変換を順次実行し、成功と失敗を集計する
 *
 * 実装理由: 一括変換時に失敗しても継続できる仕様を満たすため
 *
 * @param plan 変換計画
 * @param converter 変換実行関数
 * @param renderOptions PDF描画オプション
 * @returns 変換結果
 */
const runConversions = async (
  plan: Array<{ source: string; output: string }>,
  converter: Converter,
  renderOptions: PdfRenderOptions
): Promise<{
  outputs: Array<{ source: string; output: string }>;
  failures: Array<{ source: string; code: FailureCode; message: string }>;
}> => {
  const outputs: Array<{ source: string; output: string }> = [];
  const failures: Array<{ source: string; code: FailureCode; message: string }> = [];

  for (const item of plan) {
    try {
      await converter(item.source, item.output, renderOptions);
      outputs.push(item);
    } catch (error) {
      failures.push({
        source: item.source,
        code: classifyErrorCode(error),
        message: toErrorMessage(error)
      });
    }
  }

  return { outputs, failures };
};

/**
 * 処理名: 終了コード解決
 *
 * 処理概要: 成功件数と失敗種別からCLI終了コードを決定する
 *
 * 実装理由: 部分成功/全失敗時の判定を一元化するため
 *
 * @param successCount 成功件数
 * @param failures 失敗一覧
 * @returns 終了コード
 */
const resolveExitCode = (
  successCount: number,
  failures: Array<{ code: FailureCode }>
): number => {
  if (failures.length === 0) {
    return 0;
  }

  if (successCount > 0) {
    return 1;
  }

  const first = failures[0];
  if (first.code === 'MARKDOWN_RENDER') {
    return 3;
  }

  if (first.code === 'RENDER_TIMEOUT') {
    return 4;
  }

  if (first.code === 'PDF_WRITE') {
    return 5;
  }

  if (first.code === 'INPUT_VALIDATION') {
    return 2;
  }

  return 9;
};

/**
 * 処理名: エラー分類
 *
 * 処理概要: 例外オブジェクトから固定語彙の失敗コードを判定する
 *
 * 実装理由: レポート出力を機械可読に保つため
 *
 * @param error 発生した例外
 * @returns 失敗分類コード
 */
const classifyErrorCode = (error: unknown): FailureCode => {
  const codedError = getCodedFailure(error);
  if (codedError !== undefined) {
    return codedError;
  }

  if (error instanceof RenderTimeoutError) {
    return 'RENDER_TIMEOUT';
  }

  if (error instanceof PdfWriteError) {
    return 'PDF_WRITE';
  }

  if (error instanceof Error) {
    return classifyByMessage(error.message);
  }

  return 'UNEXPECTED';
};

/**
 * 処理名: エラーメッセージ整形
 *
 * 処理概要: 例外からユーザー向けメッセージを抽出する
 *
 * 実装理由: JSONレポートのmessageを常に文字列にするため
 *
 * @param error 発生した例外
 * @returns エラーメッセージ
 */
const toErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }

  return '想定外のエラーが発生しました。';
};

/**
 * 処理名: codeプロパティ抽出
 *
 * 処理概要: エラーオブジェクトが持つcode値を失敗コードとして解釈する
 *
 * 実装理由: 外部層から投げられた分類済みエラーを優先採用するため
 *
 * @param error 発生した例外
 * @returns 既知の失敗コード
 */
const getCodedFailure = (error: unknown): FailureCode | undefined => {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return undefined;
  }

  const code = (error as { code: string }).code;
  const knownCodes: FailureCode[] = [
    'INPUT_VALIDATION',
    'MARKDOWN_RENDER',
    'RENDER_TIMEOUT',
    'PDF_WRITE',
    'UNEXPECTED'
  ];

  return knownCodes.find((item) => item === code);
};

/**
 * 処理名: メッセージ分類
 *
 * 処理概要: エラーメッセージ文字列から失敗コードを推定する
 *
 * 実装理由: codeプロパティがない例外でも最低限の分類を行うため
 *
 * @param message エラーメッセージ
 * @returns 失敗コード
 */
const classifyByMessage = (message: string): FailureCode => {
  if (message.includes('RENDER_TIMEOUT')) {
    return 'RENDER_TIMEOUT';
  }

  if (message.includes('MARKDOWN_RENDER')) {
    return 'MARKDOWN_RENDER';
  }

  return 'UNEXPECTED';
};

/**
 * 処理名: 描画オプション構築
 *
 * 処理概要: CLI引数からPDF描画オプションを検証付きで組み立てる
 *
 * 実装理由: 引数検証ロジックをrunCli本体から分離して可読性を保つため
 *
 * @param options CLIオプション
 * @param timeoutMs タイムアウト値
 * @returns 描画オプションまたはエラー
 */
const buildRenderOptions = (
  options: CliOptions,
  timeoutMs: number
): PdfRenderOptions | { errorMessage: string } => {
  const allowedFormats: Array<'A4' | 'Letter'> = ['A4', 'Letter'];
  if (!allowedFormats.includes(options.format)) {
    return {
      errorMessage: 'INPUT_VALIDATION: --format は A4 または Letter を指定してください。'
    };
  }

  const scale = Number(options.scale);
  if (!Number.isFinite(scale) || scale < 0.1 || scale > 2) {
    return {
      errorMessage: 'INPUT_VALIDATION: --scale は 0.1 から 2.0 の範囲で指定してください。'
    };
  }

  return {
    timeoutMs,
    format: options.format,
    landscape: Boolean(options.landscape),
    scale,
    marginTop: options.marginTop,
    marginRight: options.marginRight,
    marginBottom: options.marginBottom,
    marginLeft: options.marginLeft
  };
};