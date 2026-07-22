# Danish Language Pack for Visual Studio Code

Dansk brugerflade til Visual Studio Code.

Current baseline: VS Code `1.129.0`, 25,061 language-pack messages, 14,855 Danish translations
(59.28% coverage) across the core UI and 91 built-in extension resources. Run `pnpm coverage` for
the live report.

## Installation

1. Run **Extensions: Install from VSIX...** from the Command Palette.
2. Select `vscode-language-pack-da-0.4.6.vsix`.
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

## Publishing

1. Update the `version` in `package.json` and add the release notes to `CHANGELOG.md`.
2. Update the VSIX filename in the installation instructions above to match the new version.
3. Run the complete release validation from the repository root:

   ```bash
   pnpm translate:memory
   pnpm check
   pnpm coverage
   pnpm package
   git diff --check
   ```

4. Confirm that the generated VSIX contains the core translation and all built-in extension packs.
5. Sign in to the [Visual Studio Marketplace publisher portal](https://marketplace.visualstudio.com/manage/publishers/),
   select the `katrine-jensen` publisher, and upload the generated VSIX.

## License

MIT
