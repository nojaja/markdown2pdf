import path from 'node:path';

import { planConversions } from '../../src/conversion-planner';

describe('planConversions', () => {
  test('inputフォルダとoutputフォルダ指定時は相対構造を維持して出力先を解決する', () => {
    const inputRoot = path.join('C:', 'tmp', 'docs');
    const outputDir = path.join('C:', 'tmp', 'dist');
    const markdownFiles = [
      path.join(inputRoot, 'a', 'intro.md'),
      path.join(inputRoot, 'b', 'intro.md')
    ];

    const result = planConversions({
      inputPath: inputRoot,
      outputPath: outputDir,
      markdownFiles
    });

    expect(result).toEqual([
      {
        source: path.join(inputRoot, 'a', 'intro.md'),
        output: path.join(outputDir, 'a', 'intro.pdf')
      },
      {
        source: path.join(inputRoot, 'b', 'intro.md'),
        output: path.join(outputDir, 'b', 'intro.pdf')
      }
    ]);
  });

  test('inputフォルダとoutputファイル指定時はprefix配下に相対構造で出力する', () => {
    const inputRoot = path.join('C:', 'tmp', 'docs');
    const outputFile = path.join('C:', 'tmp', 'dist', 'result.pdf');
    const markdownFiles = [
      path.join(inputRoot, 'a', 'intro.md'),
      path.join(inputRoot, 'root.md')
    ];

    const result = planConversions({
      inputPath: inputRoot,
      outputPath: outputFile,
      markdownFiles
    });

    expect(result).toEqual([
      {
        source: path.join(inputRoot, 'a', 'intro.md'),
        output: path.join('C:', 'tmp', 'dist', 'result_a', 'intro.pdf')
      },
      {
        source: path.join(inputRoot, 'root.md'),
        output: path.join('C:', 'tmp', 'dist', 'result_root', 'root.pdf')
      }
    ]);
  });
});