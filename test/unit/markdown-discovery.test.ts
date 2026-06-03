import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { discoverMarkdownFiles } from '../../src/markdown-discovery';

describe('discoverMarkdownFiles', () => {
  test('フォルダ入力時に再帰で*.mdのみを昇順で返す', () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'md2pdf-'));
    const docsDir = path.join(tempRoot, 'docs');

    fs.mkdirSync(path.join(docsDir, 'b'), { recursive: true });
    fs.mkdirSync(path.join(docsDir, 'a'), { recursive: true });
    fs.writeFileSync(path.join(docsDir, 'b', '2.md'), '# b2');
    fs.writeFileSync(path.join(docsDir, 'a', '1.md'), '# a1');
    fs.writeFileSync(path.join(docsDir, 'b', '3.txt'), 'x');

    const result = discoverMarkdownFiles(docsDir);

    expect(result).toEqual([
      path.join(docsDir, 'a', '1.md'),
      path.join(docsDir, 'b', '2.md')
    ]);

    fs.rmSync(tempRoot, { recursive: true, force: true });
  });
});