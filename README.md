# Danish Language Pack for Visual Studio Code

Use Visual Studio Code in Danish with translations for the core interface and built-in extensions.

Current baseline: VS Code `1.137.0`, 27,601 language-pack messages, 26,526 Danish translations (96.11% coverage) across the core UI and 92 built-in extension resources. Run `pnpm coverage` for the live report.

## Installation

The extension is available from the [Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=katrine-jensen.vscode-language-pack-da).

1. Open the Extensions view in VS Code and search for **Danish Language Pack by Katrine Jensen for Visual Studio Code**.
2. Select **Install**.
3. Run **Configure Display Language** from the Command Palette, select **Dansk**, and restart VS Code.

## Development

```bash
pnpm install --frozen-lockfile
pnpm check
pnpm coverage
pnpm package
```

The project uses Node.js 26, pnpm 11, TypeScript 7, Biome 2, Vitest 5, the official VS Code localization parser, and `@vscode/vsce`. The complete translation workflow is documented in the included `CONTRIBUTING.md` file.

To test a local build before publishing it:

1. Run `pnpm package`.
2. Run **Extensions: Install from VSIX...** from the Command Palette.
3. Select the generated `vscode-language-pack-da-1.0.8.vsix` file.
4. Run **Configure Display Language**, select **Dansk**, and restart VS Code.

## Publishing

1. Update the `version` in `package.json` and add the release notes to `CHANGELOG.md`.
2. Run the complete release validation from the repository root:

   ```bash
   pnpm translate:memory
   pnpm check
   pnpm coverage
   pnpm package
   git diff --check
   ```

3. Confirm that the generated VSIX contains the core translation and all built-in extension packs.
4. Sign in to the [Visual Studio Marketplace publisher portal](https://marketplace.visualstudio.com/manage/publishers/), select the `katrine-jensen` publisher, and upload the generated VSIX.
