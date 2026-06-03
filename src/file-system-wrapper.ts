import fs from 'node:fs';

export type DirectoryEntry = {
  name: string;
  isDirectory: boolean;
  isFile: boolean;
};

export interface FileSystemWrapper {
  readDirectory(targetPath: string): DirectoryEntry[];
  statPath(targetPath: string): {
    isDirectory: boolean;
    isFile: boolean;
  };
  readTextFile(targetPath: string): string;
  ensureDirectory(targetPath: string): void;
}

/**
 * 処理名: Node.jsファイルシステムラッパー
 *
 * 処理概要: ファイルシステムアクセスを抽象化して利用側を疎結合にする
 *
 * 実装理由: テスト容易性を高め、外部I/Oを直接参照する箇所を限定するため
 */
export class NodeFileSystemWrapper implements FileSystemWrapper {
  /**
   * 処理名: ディレクトリ読取
   *
   * 処理概要: 指定ディレクトリ配下のエントリ一覧を取得する
   *
   * 実装理由: 外部I/Oアクセスをラッパーへ集約するため
   *
   * @param targetPath 読み取り対象ディレクトリ
   * @returns ディレクトリエントリ一覧
   */
  public readDirectory(targetPath: string): DirectoryEntry[] {
    const entries = fs.readdirSync(targetPath, { withFileTypes: true });
    return entries.map((entry) => {
      return {
        name: entry.name,
        isDirectory: entry.isDirectory(),
        isFile: entry.isFile()
      };
    });
  }

  /**
   * 処理名: パス情報取得
   *
   * 処理概要: 指定パスがファイルかディレクトリかを判定する
   *
   * 実装理由: 入力バリデーションで種別判定が必要なため
   *
   * @param targetPath 判定対象パス
   * @returns パス種別情報
   */
  public statPath(targetPath: string): {
    isDirectory: boolean;
    isFile: boolean;
  } {
    const stat = fs.statSync(targetPath);
    return {
      isDirectory: stat.isDirectory(),
      isFile: stat.isFile()
    };
  }

  /**
   * 処理名: テキスト読取
   *
   * 処理概要: 指定ファイルをUTF-8テキストとして読み込む
   *
   * 実装理由: Markdown本文を変換処理へ渡すため
   *
   * @param targetPath 読み取り対象ファイル
   * @returns ファイル本文
   */
  public readTextFile(targetPath: string): string {
    return fs.readFileSync(targetPath, 'utf-8');
  }

  /**
   * 処理名: ディレクトリ確保
   *
   * 処理概要: 指定ディレクトリを再帰作成する
   *
   * 実装理由: PDF出力先が未作成でも変換継続可能にするため
   *
   * @param targetPath 作成対象ディレクトリ
   * @returns なし
   */
  public ensureDirectory(targetPath: string): void {
    fs.mkdirSync(targetPath, { recursive: true });
  }
}

export const defaultFileSystemWrapper = new NodeFileSystemWrapper();