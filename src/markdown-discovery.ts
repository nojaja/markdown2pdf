import path from 'node:path';

import { defaultFileSystemWrapper, type FileSystemWrapper } from './file-system-wrapper';

/**
 * 処理名: Markdown探索
 *
 * 処理概要: 指定フォルダ配下からMarkdownファイルを再帰探索して昇順で返す
 *
 * 実装理由: 変換対象を仕様どおり安定順序で確定し、実行結果の再現性を確保するため
 *
 * @param inputDirectory 入力フォルダ
 * @param fileSystem ファイルシステムラッパー
 * @returns 探索結果
 */
export const discoverMarkdownFiles = (
  inputDirectory: string,
  fileSystem: FileSystemWrapper = defaultFileSystemWrapper
): string[] => {
  const discovered: string[] = [];

  walkDirectory(inputDirectory, fileSystem, discovered);

  return discovered.sort((left, right) => left.localeCompare(right));
};

/**
 * 処理名: ディレクトリ再帰走査
 *
 * 処理概要: ディレクトリを再帰的に走査しMarkdownファイルを収集する
 *
 * 実装理由: 探索処理を分離して主処理の可読性を維持するため
 *
 * @param directoryPath 走査対象ディレクトリ
 * @param fileSystem ファイルシステムラッパー
 * @param discovered 収集先配列
 * @returns なし
 */
const walkDirectory = (
  directoryPath: string,
  fileSystem: FileSystemWrapper,
  discovered: string[]
): void => {
  const entries = fileSystem.readDirectory(directoryPath);

  for (const entry of entries) {
    const fullPath = path.join(directoryPath, entry.name);

    if (entry.isDirectory) {
      walkDirectory(fullPath, fileSystem, discovered);
      continue;
    }

    if (entry.isFile && path.extname(entry.name).toLowerCase() === '.md') {
      discovered.push(fullPath);
    }
  }
};