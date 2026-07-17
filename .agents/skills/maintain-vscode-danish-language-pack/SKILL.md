---
name: maintain-vscode-danish-language-pack
description: Maintain and extend the Danish (da) Visual Studio Code language pack in this repository. Use when adding Danish UI translations, applying the exact-source translation memory, importing XLIFF, updating the pinned VS Code catalog, measuring coverage, validating placeholders, packaging a VSIX, troubleshooting why Dansk or translated menus do not appear, or preparing a related Git commit.
---

# Maintain the Danish VS Code Language Pack

Use the repository's pinned Node, pnpm, TypeScript, Biome, Vitest, VS Code localization, and VSCE toolchain. Preserve deterministic generated output and English fallback for untranslated messages.

## Establish the current state

1. Read `package.json`, `catalog.json`, `README.md`, `CHANGELOG.md`, and `CONTRIBUTING.md`.
2. Inspect `git status --short` before editing. Preserve unrelated and user-authored changes.
3. Run `pnpm coverage` when the current message count matters. Do not copy a stale count from documentation.
4. Treat `translations/**/*.i18n.json` as generated artifacts.

## Choose the translation input

Use one of these paths:

- For agent-authored, context-independent translations, update `scripts/data/translation-memory.da.json`, then run `pnpm translate:memory`.
- For translated XLIFF supplied by a CAT workflow, place it under `xliff/`, run `pnpm import:xlf -- xliff --dry-run`, then run `pnpm import:xlf -- xliff`.
- If the English source catalog is absent or the pinned VS Code release changes, run `pnpm source:export` first. Expect this command to use network access and write under `$XDG_CACHE_HOME/vscode-language-pack-da` or `~/.cache/vscode-language-pack-da`; request approval when required and disclose the external write.

The translation-memory generator reads exact English source messages from:

```text
$XDG_CACHE_HOME/vscode-language-pack-da/sources/<vscode-version>/vscode-translations-export
~/.cache/vscode-language-pack-da/sources/<vscode-version>/vscode-translations-export (fallback)
```

It preserves existing translations, validates placeholders, generates core and built-in extension packs, and synchronizes the localization entries in `package.json`. Its `Applied X/Y` line describes additions made during that invocation; use `pnpm coverage` for the total packaged count.

## Translate safely

1. Copy the English source string exactly as the translation-memory key, including capitalization, punctuation, leading or trailing spaces, and line breaks.
2. Preserve every placeholder exactly: `{0}`, `{1:format}`, `${variable}`, `$(icon-name)`, `%s`, and related tokens.
3. Preserve `&&` menu mnemonic markers. Translate the visible label while retaining a valid marker, for example `&&File` to `&&Filer`.
4. Preserve Markdown destinations, command IDs, setting IDs, filenames, code, and product names unless only their surrounding prose is translated.
5. Use natural Danish and keep terminology consistent. Prefer `Fil`, `Mappe`, `Arbejdsområde`, `Stifinder`, `Indstillinger`, `Kildekontrol`, `Fejlfinding`, and `Udvidelse` for the corresponding UI concepts.
6. Add only context-independent phrases to the global exact-source memory. If identical English text needs different Danish translations in different modules, use contextual XLIFF or extend the generator with explicit contextual overrides.
7. Never add guessed message IDs or edit generated translation packs directly. Correct the translation input and regenerate.

Prioritize visible UI before low-value descriptions: top menus, Command Palette actions, Explorer, Search, Settings, Terminal, Source Control, Run and Debug, Extensions, notifications, editor status, and layout controls.

## Refresh the VS Code baseline

1. Update `engines.vscode` only when intentionally targeting another VS Code release.
2. Export that exact release with `pnpm source:export -- --ref=<version>`.
3. Review the updated `catalog.json` release, commit, file count, and message count.
4. Reapply exact-source translations with `pnpm translate:memory` and inspect coverage changes.
5. Keep the language identity exactly `da / Danish / Dansk` in the localization contribution.

## Prepare a user-visible release

1. Bump the extension version whenever translations change. VS Code keys its language-pack cache by extension identity and version; reusing a version can leave menus in English after reinstalling.
2. Update `CHANGELOG.md` with the new coverage focus and built-in extension resources.
3. Update `README.md` with the measured translation count and the new VSIX filename.
4. Keep installation instructions limited to **Extensions: Install from VSIX...**, followed by **Configure Display Language**, selecting **Dansk**, and restarting VS Code. Do not add command-line or VS Code Insiders installation instructions.
5. Do not delete or alter `~/.cache/vscode-language-pack-da` merely to fix display-language selection. Prefer a version bump and a newly packaged VSIX.

## Validate and package

Run the complete sequence from the repository root:

```bash
pnpm translate:memory
pnpm check
pnpm coverage
pnpm package
git diff --check
```

Require all type checks, Biome checks, tests, localization validation, and VSCE packaging to pass. Confirm that validation reports the expected number of files, modules, and messages. Confirm that the VSIX contains `translations/main.i18n.json` plus every built-in extension pack registered in `package.json`.

The generated `*.vsix` is ignored by Git. Give the user the workspace path to the new file, but do not force-add it to a commit.

## Commit deliberately

1. Review `git status --short`, `git diff --stat`, and `git diff --check`.
2. Stage only the intended source, generated translation packs, manifest, documentation, and repo-local skill files.
3. Commit only when the user requests it. Do not amend, squash, reset, or rewrite earlier commits without explicit authorization.
4. Report the commit hash, validation result, translation count, coverage, and VSIX path.
