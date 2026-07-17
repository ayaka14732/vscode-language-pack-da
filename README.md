# Danish Language Pack for Visual Studio Code

Dansk brugerflade til Visual Studio Code.

> This project is an early community preview. The import and validation pipeline is ready, but
> translation coverage is still limited. Missing strings use VS Code's English fallback.

Current baseline: VS Code `1.129.0`, 25,061 language-pack messages, 13 Danish translations. Run
`pnpm coverage` for the live report.

## Installation

Build and install the local VSIX:

```bash
pnpm install --frozen-lockfile
pnpm package
code --install-extension vscode-language-pack-da-0.1.0.vsix
```

Run **Configure Display Language**, select **Dansk**, and restart VS Code.

## Development

```bash
pnpm check
pnpm coverage
```

The project uses Node.js 26, pnpm 11, TypeScript 7, Biome 2, Vitest 4, the official VS Code
localization parser, and `@vscode/vsce`. The complete translation workflow is documented in the
included `CONTRIBUTING.md` file.

Before publishing, replace the placeholder `publisher` in `package.json` with the Marketplace
publisher that owns the extension.

## License

MIT
