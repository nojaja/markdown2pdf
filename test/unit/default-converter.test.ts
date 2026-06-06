import { createDefaultConverter } from '../../src/default-converter';

describe('createDefaultConverter', () => {
  test('HTMLにCDNのMermaid script参照を含めない', async () => {
    const markdown = ['```mermaid', 'graph TD', 'A-->B', '```'].join('\n');

    const fileSystem = {
      readDirectory: jest.fn(),
      statPath: jest.fn(),
      readTextFile: jest.fn().mockReturnValue(markdown),
      ensureDirectory: jest.fn()
    };

    const pdfRenderer = {
      renderHtmlToPdf: jest.fn().mockResolvedValue(undefined)
    };

    const converter = createDefaultConverter(fileSystem, pdfRenderer);
    await converter('docs/sample.md', 'dist/sample.pdf', {
      timeoutMs: 1234,
      format: 'A4',
      landscape: false,
      scale: 1,
      marginTop: '10mm',
      marginRight: '10mm',
      marginBottom: '10mm',
      marginLeft: '10mm'
    });

    const htmlArg = (pdfRenderer.renderHtmlToPdf as jest.Mock).mock.calls[0][0] as string;
    expect(htmlArg).not.toContain('https://cdn.jsdelivr.net/npm/mermaid');
  });

  test('同梱したMermaidスクリプト文字列をHTMLへ埋め込む', async () => {
    const markdown = ['```mermaid', 'graph TD', 'A-->B', '```'].join('\n');

    const fileSystem = {
      readDirectory: jest.fn(),
      statPath: jest.fn(),
      readTextFile: jest.fn().mockReturnValue(markdown),
      ensureDirectory: jest.fn()
    };

    const pdfRenderer = {
      renderHtmlToPdf: jest.fn().mockResolvedValue(undefined)
    };

    const mermaidScriptLoader = jest.fn().mockReturnValue('window.__BUNDLED_MERMAID__ = true;');

    const converter = createDefaultConverter(fileSystem, pdfRenderer, mermaidScriptLoader);
    await converter('docs/sample.md', 'dist/sample.pdf', {
      timeoutMs: 1234,
      format: 'A4',
      landscape: false,
      scale: 1,
      marginTop: '10mm',
      marginRight: '10mm',
      marginBottom: '10mm',
      marginLeft: '10mm'
    });

    expect(mermaidScriptLoader).toHaveBeenCalledTimes(1);

    const htmlArg = (pdfRenderer.renderHtmlToPdf as jest.Mock).mock.calls[0][0] as string;
    expect(htmlArg).toContain('window.__BUNDLED_MERMAID__ = true;');
  });

  test('Markdownを読み込みHTML化してPDFレンダラーへ渡す', async () => {
    const markdown = ['```mermaid', 'graph TD', 'A-->B', '```'].join('\n');

    const fileSystem = {
      readDirectory: jest.fn(),
      statPath: jest.fn(),
      readTextFile: jest.fn().mockReturnValue(markdown),
      ensureDirectory: jest.fn()
    };

    const pdfRenderer = {
      renderHtmlToPdf: jest.fn().mockResolvedValue(undefined)
    };

    const converter = createDefaultConverter(fileSystem, pdfRenderer);
    await converter('docs/sample.md', 'dist/sample.pdf', {
      timeoutMs: 1234,
      format: 'A4',
      landscape: false,
      scale: 1,
      marginTop: '10mm',
      marginRight: '10mm',
      marginBottom: '10mm',
      marginLeft: '10mm'
    });

    expect(fileSystem.readTextFile).toHaveBeenCalledWith('docs/sample.md');
    expect(fileSystem.ensureDirectory).toHaveBeenCalledWith('dist');
    expect(pdfRenderer.renderHtmlToPdf).toHaveBeenCalledTimes(1);

    const htmlArg = (pdfRenderer.renderHtmlToPdf as jest.Mock).mock.calls[0][0] as string;
    expect(htmlArg).toContain('<div class="mermaid">');
    expect(htmlArg).toContain('mermaid.initialize');
    expect(htmlArg).toContain('A-->B');
  });

  test('Gantt diagrams を含むMermaid記法をHTMLへ保持してレンダリングに渡す', async () => {
    const markdown = [
      '```mermaid',
      'gantt',
      '  title Mermaid Gantt Test',
      '  dateFormat  YYYY-MM-DD',
      '  section Design',
      '  spec           :done,    des1, 2026-01-06,2026-01-08',
      '  section Build',
      '  implement      :active,  dev1, 2026-01-09, 3d',
      '```'
    ].join('\n');

    const fileSystem = {
      readDirectory: jest.fn(),
      statPath: jest.fn(),
      readTextFile: jest.fn().mockReturnValue(markdown),
      ensureDirectory: jest.fn()
    };

    const pdfRenderer = {
      renderHtmlToPdf: jest.fn().mockResolvedValue(undefined)
    };

    const converter = createDefaultConverter(fileSystem, pdfRenderer);
    await converter('docs/gantt.md', 'dist/gantt.pdf', {
      timeoutMs: 30000,
      format: 'A4',
      landscape: false,
      scale: 1,
      marginTop: '10mm',
      marginRight: '10mm',
      marginBottom: '10mm',
      marginLeft: '10mm'
    });

    const htmlArg = (pdfRenderer.renderHtmlToPdf as jest.Mock).mock.calls[0][0] as string;
    expect(htmlArg).toContain('<div class="mermaid">');
    expect(htmlArg).toContain('gantt');
    expect(htmlArg).toContain('dateFormat  YYYY-MM-DD');
    expect(htmlArg).toContain('section Design');
    expect(htmlArg).toContain('implement      :active');
  });
});