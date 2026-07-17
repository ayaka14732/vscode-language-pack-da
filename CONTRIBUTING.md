# Contributing

## Prerequisites

- Node.js `26.4.0` (see `.node-version`)
- pnpm `11.13.1` through Corepack
- Git

Install the reproducible toolchain:

```bash
corepack enable
pnpm install --frozen-lockfile
```

## Export the current English source catalog

The pinned VS Code release is read from `engines.vscode` in `package.json`:

```bash
pnpm source:export
```

This performs a shallow, blob-filtered checkout of VS Code and runs its official
`vscode-translations-export` task. It automatically uses the Node version pinned by VS Code's
`.nvmrc`, while the language-pack tooling remains on Node 26. The checkout and generated files
remain under `$XDG_CACHE_HOME/vscode-language-pack-da` (or `~/.cache/vscode-language-pack-da`);
`catalog.json` records the exact release, commit, and message count.
Expect the first export to take time because VS Code's build dependencies must be installed.

To export another release explicitly:

```bash
pnpm source:export -- --ref=1.129.0
```

## Translate

Import the exported XLIFF files into an XLIFF 1.2-compatible CAT platform. Export Danish files
with `target-language="da"`. Preserve:

- message IDs and source paths;
- `{0}`, `{1}`, `${variable}`, `%s`, and similar placeholders;
- `$(icon-name)` icon tokens;
- Markdown links, command IDs, punctuation, and intentional line breaks.

Place translated files anywhere below `xliff/`. A project/language layout is recommended:

```text
xliff/
  vscode-editor/da/*.xlf
  vscode-workbench/da/*.xlf
  vscode-extensions/da/*.xlf
```

## Generate the language pack

```bash
pnpm import:xlf -- xliff
pnpm check
pnpm coverage
pnpm package
```

The importer uses Microsoft's `@vscode/l10n-dev` parser, produces deterministic JSON, registers
built-in extension packs in `package.json`, rejects locale or placeholder mismatches, and writes an
ignored coverage report to `reports/import-report.json`.

Use a dry run before replacing generated translations:

```bash
pnpm import:xlf -- xliff --dry-run
```

Do not edit generated `translations/**/*.i18n.json` files when the corresponding XLIFF source is
available. Correct the XLIFF and regenerate instead.
