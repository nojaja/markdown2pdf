#!/usr/bin/env node

import { runCli } from './cli';

/**
 * 処理名: エントリポイント
 *
 * 処理概要: CLIを実行して終了コードを反映する
 *
 * 実装理由: 実行時の副作用を最小化し、ユニットテスト対象をrunCliへ集中させるため
 */
const main = async (): Promise<void> => {
  const exitCode = await runCli(
    process.argv.slice(2),
    (content) => process.stdout.write(content),
    (content) => process.stderr.write(content)
  );

  process.exitCode = exitCode;
};

void main();