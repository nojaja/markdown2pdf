# mermaid-md-pdf-cli

`mermaid-md-pdf-cli` is a command-line tool that converts Markdown files into PDF documents, including Mermaid diagrams rendered through a headless browser.

If you are using the package from `npx`, start with the usage examples below.

If you are an AI agent, prefer the JSON help and report modes so you can inspect arguments and outputs mechanically.

## Usage

Run the CLI with `npx`:

```bash
npx mermaid-md-pdf-cli --help
```


Convert a single Markdown file:

```bash
npx mermaid-md-pdf-cli --input sample/Gantt_Sample.md --output sample/Gantt_Sample.pdf
```

Convert every Markdown file in a directory while preserving the relative folder structure:

```bash
npx mermaid-md-pdf-cli --input docs --output dist
```

Generate a conversion plan without writing PDFs:

```bash
npx mermaid-md-pdf-cli --input docs --plan --report-format json
```

## AI Agent Usage

Use these options when another tool or agent needs to understand the CLI without parsing prose.

- `--help-format json`: returns the command schema, option types, defaults, and constraints as JSON.
- `--report-format json`: returns machine-readable execution results.
- `--plan`: lists target files and output paths without rendering PDFs.

Recommended flow for agents:

```bash
npx mermaid-md-pdf-cli --help-format json
npx mermaid-md-pdf-cli --input docs --plan --report-format json
npx mermaid-md-pdf-cli --input docs --report-format json
```

## Installation

```bash
npm install
npm run build
```

To run conversion directly from the built `dist` output, use:

```bash
node ./dist/src/index.js --input sample/Gantt_Sample.md --output sample/Gantt_Sample.pdf
```

## Configuration

The CLI supports the following options:

- `--input <path>`: Markdown file or directory to convert. Required.
- `--output <path>`: Output PDF file or directory.
- `--plan`: Print the planned conversions without rendering PDFs.
- `--report-format <text|json>`: Select the report format.
- `--help-format <text|json>`: Print help output as JSON for automated use.
- `--timeout <ms>`: PDF rendering timeout. Default: `30000`.
- `--format <A4|Letter>`: Paper size. Default: `A4`.
- `--landscape`: Render the PDF in landscape orientation.
- `--scale <number>`: Page scale. Default: `1`.
- `--margin-top`, `--margin-right`, `--margin-bottom`, `--margin-left`: CSS margin values. Default: `10mm`.

Shorthand aliases are also available:

- `-i`: `--input`
- `-o`: `--output`
- `-p`: `--plan`
- `-r`: `--report-format`
- `-j`: `--help-format`
- `-t`: `--timeout`
- `-f`: `--format`
- `-l`: `--landscape`
- `-s`: `--scale`

If you need to point Puppeteer to a specific browser binary, set `PUPPETEER_EXECUTABLE_PATH`.

Mermaid diagrams are loaded from the jsDelivr CDN at render time, so network access is required when converting documents that use Mermaid.

## Examples

The repository includes a sample file you can use to verify the renderer:

```bash
npx mermaid-md-pdf-cli --input sample/Gantt_Sample.md --output sample/Gantt_Sample.pdf
```

For folder inputs, output paths keep the source directory layout. By default, PDFs are written under `<input>/_pdf/`.

## Support

TODO: add the project issue tracker, discussion board, or maintainer contact here.

## Contributing

Contributions are welcome.

- Open an issue or submit a pull request for changes.
- Run the test and lint suite before sending patches:

```bash
npm test
npm run test:e2e
npm run lint
npm run type-check
```

## License

See [LICENSE](LICENSE) for license terms.