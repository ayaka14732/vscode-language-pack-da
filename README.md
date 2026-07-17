# Danish Language Pack for Visual Studio Code

Dansk brugerflade til Visual Studio Code.

> This project is an early community preview. The import and validation pipeline is ready, but
> translation coverage is still limited. Missing strings use VS Code's English fallback.

Current baseline: VS Code `1.129.0`, 25,061 language-pack messages, 8,491 Danish translations
across the core UI and 20 built-in extension resources. Run `pnpm coverage` for the live report.

## Installation

1. Run **Extensions: Install from VSIX...** from the Command Palette.
2. Select `vscode-language-pack-da-0.3.0.vsix`.
3. Run **Configure Display Language**, select **Dansk**, and restart VS Code.

## Development

```bash
pnpm install --frozen-lockfile
pnpm check
pnpm coverage
pnpm package
```

The project uses Node.js 26, pnpm 11, TypeScript 7, Biome 2, Vitest 4, the official VS Code
localization parser, and `@vscode/vsce`. The complete translation workflow is documented in the
included `CONTRIBUTING.md` file.

Before publishing, replace the placeholder `publisher` in `package.json` with the Marketplace
publisher that owns the extension.

## License

MIT
