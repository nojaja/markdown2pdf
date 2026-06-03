import fs from 'node:fs';

import { PdfWriteError, PuppeteerPdfRenderer, RenderTimeoutError } from '../../src/pdf-renderer';

const defaultOptions = {
  timeoutMs: 1000,
  format: 'A4' as const,
  landscape: false,
  scale: 1,
  marginTop: '10mm',
  marginRight: '10mm',
  marginBottom: '10mm',
  marginLeft: '10mm'
};

const createPuppeteerMock = () => {
  class FakeTimeoutError extends Error {}

  return {
    default: {
      launch: jest.fn()
    },
    TimeoutError: FakeTimeoutError
  };
};

describe('PuppeteerPdfRenderer', () => {
  const originalExecutable = process.env.PUPPETEER_EXECUTABLE_PATH;

  afterEach(() => {
    process.env.PUPPETEER_EXECUTABLE_PATH = originalExecutable;
    jest.restoreAllMocks();
  });

  test('ブラウザパスが見つからない場合はPdfWriteErrorを投げる', async () => {
    process.env.PUPPETEER_EXECUTABLE_PATH = 'C:/missing/chrome.exe';
    jest.spyOn(fs, 'existsSync').mockReturnValue(false);

    const renderer = new PuppeteerPdfRenderer(async () => createPuppeteerMock() as never);

    await expect(renderer.renderHtmlToPdf('<html></html>', 'dist/out.pdf', defaultOptions)).rejects.toBeInstanceOf(
      PdfWriteError
    );
  });

  test('レンダリングタイムアウト時はRenderTimeoutErrorを投げる', async () => {
    process.env.PUPPETEER_EXECUTABLE_PATH = 'C:/exists/chrome.exe';
    jest.spyOn(fs, 'existsSync').mockReturnValue(true);

    const mockedModule = createPuppeteerMock();

    const timeoutError = new mockedModule.TimeoutError('timeout');
    const browser = {
      newPage: jest.fn().mockResolvedValue({
        setContent: jest.fn().mockRejectedValue(timeoutError)
      }),
      close: jest.fn().mockResolvedValue(undefined)
    };
    mockedModule.default.launch.mockResolvedValue(browser);

    const renderer = new PuppeteerPdfRenderer(async () => mockedModule as never);

    await expect(renderer.renderHtmlToPdf('<html></html>', 'dist/out.pdf', defaultOptions)).rejects.toBeInstanceOf(
      RenderTimeoutError
    );
  });
});