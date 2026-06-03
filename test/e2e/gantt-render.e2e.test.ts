import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

describe('md2pdf e2e gantt rendering', () => {
  jest.setTimeout(120000);

  test('Gantt diagrams を含むMarkdownをPDFへ変換できる', async () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'md2pdf-e2e-'));
    const inputFile = path.join(tempRoot, 'gantt.md');
    const outputFile = path.join(tempRoot, 'gantt.pdf');

    const markdown = [
      '# Gantt Sample',
      '',
      '```mermaid',
      'gantt',
      '  title Mermaid Gantt E2E',
      '  dateFormat  YYYY-MM-DD',
      '  section Design',
      '  spec          :done,    des1, 2026-01-06,2026-01-08',
      '  section Build',
      '  implement     :active,  dev1, 2026-01-09, 3d',
      '```'
    ].join('\n');

    fs.writeFileSync(inputFile, markdown, 'utf-8');

    const cliPath = path.join(process.cwd(), 'dist', 'src', 'index.js');
    const result = spawnSync(
      process.execPath,
      ['--no-warnings', cliPath, '--input', inputFile, '--output', outputFile, '--timeout', '60000', '--format', 'A4'],
      {
        encoding: 'utf-8'
      }
    );

    const exitCode = result.status ?? -1;
    const stdout = result.stdout ?? '';
    const stderr = result.stderr ?? '';

    if (exitCode !== 0) {
      throw new Error(`expected exit 0 but got ${exitCode}; stdout=${stdout}; stderr=${stderr}`);
    }

    expect(fs.existsSync(outputFile)).toBe(true);
    const stat = fs.statSync(outputFile);
    expect(stat.size).toBeGreaterThan(0);

    fs.rmSync(tempRoot, { recursive: true, force: true });
  });
});