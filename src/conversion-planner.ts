import path from 'node:path';

export type ConversionPlan = {
  source: string;
  output: string;
};

export type PlanInput = {
  inputPath: string;
  outputPath?: string;
  markdownFiles: string[];
};

/**
 * 処理名: PDF変換計画の解決
 *
 * 処理概要: 入力条件からMarkdownファイルごとのPDF出力先を決定する
 *
 * 実装理由: 実変換前に確定した出力先を扱えるようにし、AIエージェント実行時の予測可能性を確保するため
 *
 * @param input 入力条件
 * @returns 変換計画の一覧
 */
export const planConversions = (input: PlanInput): ConversionPlan[] => {
  const normalizedInput = path.normalize(input.inputPath);
  const isInputFile =
    input.markdownFiles.length === 1 &&
    path.normalize(input.markdownFiles[0]) === normalizedInput;

  return input.markdownFiles.map((sourceFile) => {
    const output = isInputFile
      ? planForSingleInput(sourceFile, input.outputPath)
      : planForDirectoryInput(sourceFile, normalizedInput, input.outputPath);

    return {
      source: sourceFile,
      output
    };
  });
};

/**
 * 処理名: 単一入力の出力解決
 *
 * 処理概要: inputが単一Markdownファイルの場合の出力先を決定する
 *
 * 実装理由: 単体変換のルールを複数入力ルールと分離し、条件分岐の複雑性を抑えるため
 *
 * @param sourceFile 入力Markdownファイル
 * @param outputPath 出力パス
 * @returns 解決済みのPDF出力先
 */
const planForSingleInput = (sourceFile: string, outputPath?: string): string => {
  const baseName = toPdfFileName(sourceFile);

  if (outputPath === undefined) {
    return path.join(path.dirname(sourceFile), baseName);
  }

  if (isPdfFilePath(outputPath)) {
    return outputPath;
  }

  return path.join(outputPath, baseName);
};

/**
 * 処理名: フォルダ入力の出力解決
 *
 * 処理概要: inputがフォルダの場合の相対構造と命名規則に従って出力先を決定する
 *
 * 実装理由: 同名ファイル衝突を避けつつ仕様で要求された相対構造維持を実現するため
 *
 * @param sourceFile 入力Markdownファイル
 * @param inputRoot 入力フォルダ
 * @param outputPath 出力パス
 * @returns 解決済みのPDF出力先
 */
const planForDirectoryInput = (
  sourceFile: string,
  inputRoot: string,
  outputPath?: string
): string => {
  const relativePath = path.relative(inputRoot, sourceFile);
  const relativeDir = path.dirname(relativePath);
  const outputFileName = toPdfFileName(sourceFile);

  if (outputPath === undefined) {
    return path.join(inputRoot, '_pdf', relativeDir, outputFileName);
  }

  if (!isPdfFilePath(outputPath)) {
    return path.join(outputPath, relativeDir, outputFileName);
  }

  const outputDir = path.dirname(outputPath);
  const outputStem = path.basename(outputPath, path.extname(outputPath));
  const firstSegment = getFirstRelativeSegment(relativePath);
  const childRelativeDir = getChildRelativeDir(relativePath);

  return path.join(outputDir, `${outputStem}_${firstSegment}`, childRelativeDir, outputFileName);
};

/**
 * 処理名: PDFファイル名生成
 *
 * 処理概要: Markdownファイル名をPDF拡張子に変換する
 *
 * 実装理由: 命名ルールを一箇所にまとめるため
 *
 * @param sourceFile 入力Markdownファイル
 * @returns PDFファイル名
 */
const toPdfFileName = (sourceFile: string): string => {
  return `${path.basename(sourceFile, path.extname(sourceFile))}.pdf`;
};

/**
 * 処理名: PDFパス判定
 *
 * 処理概要: 指定パスがPDFファイル指定かどうかを判定する
 *
 * 実装理由: 出力モード（ファイル/フォルダ）の分岐に利用するため
 *
 * @param targetPath 判定対象パス
 * @returns PDFファイル指定であればtrue
 */
const isPdfFilePath = (targetPath: string): boolean => {
  return path.extname(targetPath).toLowerCase() === '.pdf';
};

/**
 * 処理名: 相対先頭セグメント取得
 *
 * 処理概要: 相対パスの先頭ディレクトリ名を返す
 *
 * 実装理由: output=ファイル時のプレフィックスフォルダ名決定に必要なため
 *
 * @param relativePath 入力ルートからの相対パス
 * @returns 先頭セグメント（直下ファイルはroot）
 */
const getFirstRelativeSegment = (relativePath: string): string => {
  const parts = relativePath.split(path.sep).filter((segment) => segment.length > 0);
  if (parts.length <= 1) {
    return 'root';
  }

  return parts[0];
};

/**
 * 処理名: 子相対ディレクトリ取得
 *
 * 処理概要: 先頭セグメントを除いた下位ディレクトリ部を返す
 *
 * 実装理由: output=ファイル時に `result_a/` 直下へ期待どおり配置するため
 *
 * @param relativePath 入力ルートからの相対パス
 * @returns 先頭セグメントを除いた相対ディレクトリ
 */
const getChildRelativeDir = (relativePath: string): string => {
  const parts = relativePath.split(path.sep).filter((segment) => segment.length > 0);
  if (parts.length <= 2) {
    return '';
  }

  return parts.slice(1, -1).join(path.sep);
};