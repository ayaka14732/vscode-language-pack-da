# Danish Language Pack for Visual Studio Code

Use Visual Studio Code in Danish with translations for the core interface and built-in extensions.

Current baseline: VS Code `1.137.0`, 27,601 language-pack messages, 27,601 Danish translations (100.00% coverage) across the core UI and 92 built-in extension resources. Run `pnpm coverage` for the live report.

## Installation

The extension is available from the [Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=katrine-jensen-next.vscode-language-pack-da-next).

The publisher is now `katrine-jensen-next`. If you installed the previous `katrine-jensen.vscode-language-pack-da` listing, install the new listing separately to receive future updates.

1. Open the Extensions view in VS Code and search for **Danish Language Pack by Katrine Jensen for Visual Studio Code (Next)**.
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
3. Select the generated `vscode-language-pack-da-next-1.0.10.vsix` file.
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
4. Authenticate as a member of the `katrine-jensen-next` publisher with the Owner or Contributor role. For PAT authentication, create a token with the Marketplace Manage scope for all accessible organizations, then enter it at the terminal prompt:

   ```bash
   pnpm exec vsce login katrine-jensen-next
   pnpm exec vsce verify-pat katrine-jensen-next
   ```

5. Upload the validated VSIX, using the filename for the release being published:

   ```bash
   pnpm exec vsce publish --packagePath ./vscode-language-pack-da-next-1.0.10.vsix
   ```

6. Check the [publisher portal](https://marketplace.visualstudio.com/manage/publishers/katrine-jensen-next) for successful processing and confirm the version on the Marketplace listing.

Global Azure DevOps PATs are [scheduled to retire on December 1, 2026](https://devblogs.microsoft.com/devops/retirement-of-global-personal-access-tokens-in-azure-devops/). For Microsoft Entra authentication, sign in with Azure CLI using an identity that has the publisher role above, then use `--azure-credential` with `vsce verify-pat` and `vsce publish` instead of `vsce login`. Unset `VSCE_PAT` first so it does not override Entra authentication.
