import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { runCli } from '../../src/cli';

describe('runCli', () => {
  test('--plan --report-format json で計画JSONを返す', async () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'md2pdf-cli-'));
    const inputDir = path.join(tempRoot, 'docs');
    fs.mkdirSync(path.join(inputDir, 'a'), { recursive: true });
    fs.writeFileSync(path.join(inputDir, 'a', 'intro.md'), '# hello');

    let stdout = '';
    let stderr = '';

    const exitCode = await runCli(
      ['--input', inputDir, '--output', path.join(tempRoot, 'dist'), '--plan', '--report-format', 'json'],
      (content) => {
        stdout += content;
      },
      (content) => {
        stderr += content;
      }
    );

    expect(exitCode).toBe(0);
    expect(stderr).toBe('');

    const parsed = JSON.parse(stdout);
    expect(parsed.schemaVersion).toBe('1.0');
    expect(parsed.summary.targets).toBe(1);
    expect(parsed.outputs[0].output).toContain(path.join('dist', 'a', 'intro.pdf'));

    fs.rmSync(tempRoot, { recursive: true, force: true });
  });

  test('通常実行時に変換が成功したらexit code 0で成功件数を返す', async () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'md2pdf-cli-run-'));
    const inputDir = path.join(tempRoot, 'docs');
    fs.mkdirSync(path.join(inputDir, 'a'), { recursive: true });
    fs.writeFileSync(path.join(inputDir, 'a', 'intro.md'), '# hello');

    let stdout = '';

    const converted: Array<{ source: string; output: string }> = [];
    const exitCode = await runCli(
      ['--input', inputDir, '--output', path.join(tempRoot, 'dist'), '--report-format', 'json'],
      (content) => {
        stdout += content;
      },
      () => {
        // noop
      },
      {
        converter: async (source, output) => {
          converted.push({ source, output });
        }
      }
    );

    expect(exitCode).toBe(0);
    const parsed = JSON.parse(stdout);
    expect(parsed.summary.targets).toBe(1);
    expect(parsed.summary.success).toBe(1);
    expect(parsed.summary.failed).toBe(0);
    expect(converted).toHaveLength(1);

    fs.rmSync(tempRoot, { recursive: true, force: true });
  });

  test('通常実行時に一部失敗したら継続してexit code 1と失敗分類を返す', async () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'md2pdf-cli-partial-'));
    const inputDir = path.join(tempRoot, 'docs');
    fs.mkdirSync(path.join(inputDir, 'a'), { recursive: true });
    fs.mkdirSync(path.join(inputDir, 'b'), { recursive: true });
    fs.writeFileSync(path.join(inputDir, 'a', 'ok.md'), '# ok');
    fs.writeFileSync(path.join(inputDir, 'b', 'ng.md'), '# ng');

    let stdout = '';

    const exitCode = await runCli(
      ['--input', inputDir, '--output', path.join(tempRoot, 'dist'), '--report-format', 'json'],
      (content) => {
        stdout += content;
      },
      () => {
        // noop
      },
      {
        converter: async (source) => {
          if (source.endsWith('ng.md')) {
            const error = new Error('タイムアウト');
            (error as Error & { code: string }).code = 'RENDER_TIMEOUT';
            throw error;
          }
        }
      }
    );

    expect(exitCode).toBe(1);
    const parsed = JSON.parse(stdout);
    expect(parsed.summary.targets).toBe(2);
    expect(parsed.summary.success).toBe(1);
    expect(parsed.summary.failed).toBe(1);
    expect(parsed.failures[0].code).toBe('RENDER_TIMEOUT');

    fs.rmSync(tempRoot, { recursive: true, force: true });
  });

  test('--timeout が不正値の場合はINPUT_VALIDATIONで終了する', async () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'md2pdf-cli-timeout-'));
    const inputFile = path.join(tempRoot, 'sample.md');
    fs.writeFileSync(inputFile, '# hello');

    let stdout = '';

    const exitCode = await runCli(
      ['--input', inputFile, '--timeout', '0', '--report-format', 'json'],
      (content) => {
        stdout += content;
      },
      () => {
        // noop
      }
    );

    expect(exitCode).toBe(2);
    const parsed = JSON.parse(stdout);
    expect(parsed.failures[0].code).toBe('INPUT_VALIDATION');

    fs.rmSync(tempRoot, { recursive: true, force: true });
  });

  test('短縮オプション指定時も通常どおり変換計画を返す', async () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'md2pdf-cli-short-'));
    const inputDir = path.join(tempRoot, 'docs');
    fs.mkdirSync(path.join(inputDir, 'a'), { recursive: true });
    fs.writeFileSync(path.join(inputDir, 'a', 'intro.md'), '# hello');

    let stdout = '';
    let stderr = '';

    const exitCode = await runCli(
      ['-i', inputDir, '-o', path.join(tempRoot, 'dist'), '-p', '-r', 'json'],
      (content) => {
        stdout += content;
      },
      (content) => {
        stderr += content;
      }
    );

    expect(exitCode).toBe(0);
    expect(stderr).toBe('');

    const parsed = JSON.parse(stdout);
    expect(parsed.summary.targets).toBe(1);
    expect(parsed.summary.success).toBe(1);
    expect(parsed.summary.failed).toBe(0);

    fs.rmSync(tempRoot, { recursive: true, force: true });
  });

  test('通常実行時に全件失敗かつタイムアウト分類ならexit code 4を返す', async () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'md2pdf-cli-allfail-'));
    const inputFile = path.join(tempRoot, 'sample.md');
    fs.writeFileSync(inputFile, '# hello');

    let stdout = '';

    const exitCode = await runCli(
      ['--input', inputFile, '--output', path.join(tempRoot, 'out.pdf'), '--report-format', 'json'],
      (content) => {
        stdout += content;
      },
      () => {
        // noop
      },
      {
        converter: async () => {
          const error = new Error('RENDER_TIMEOUT: timeout');
          throw error;
        }
      }
    );

    expect(exitCode).toBe(4);
    const parsed = JSON.parse(stdout);
    expect(parsed.summary.success).toBe(0);
    expect(parsed.summary.failed).toBe(1);
    expect(parsed.failures[0].code).toBe('RENDER_TIMEOUT');

    fs.rmSync(tempRoot, { recursive: true, force: true });
  });

  test('PDFオプション引数を指定した場合にconverterへ正しく伝搬される', async () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'md2pdf-cli-options-'));
    const inputFile = path.join(tempRoot, 'sample.md');
    fs.writeFileSync(inputFile, '# hello');

    const receivedOptions: Array<{
      timeoutMs: number;
      format: string;
      landscape: boolean;
      scale: number;
      marginTop: string;
      marginRight: string;
      marginBottom: string;
      marginLeft: string;
    }> = [];

    const exitCode = await runCli(
      [
        '--input',
        inputFile,
        '--output',
        path.join(tempRoot, 'out.pdf'),
        '--timeout',
        '60000',
        '--format',
        'Letter',
        '--landscape',
        '--scale',
        '1.25',
        '--margin-top',
        '12mm',
        '--margin-right',
        '13mm',
        '--margin-bottom',
        '14mm',
        '--margin-left',
        '15mm'
      ],
      () => {
        // noop
      },
      () => {
        // noop
      },
      {
        converter: async (_source, _output, options) => {
          receivedOptions.push(options as unknown as {
            timeoutMs: number;
            format: string;
            landscape: boolean;
            scale: number;
            marginTop: string;
            marginRight: string;
            marginBottom: string;
            marginLeft: string;
          });
        }
      }
    );

    expect(exitCode).toBe(0);
    expect(receivedOptions).toHaveLength(1);
    expect(receivedOptions[0]).toEqual({
      timeoutMs: 60000,
      format: 'Letter',
      landscape: true,
      scale: 1.25,
      marginTop: '12mm',
      marginRight: '13mm',
      marginBottom: '14mm',
      marginLeft: '15mm'
    });

    fs.rmSync(tempRoot, { recursive: true, force: true });
  });
});