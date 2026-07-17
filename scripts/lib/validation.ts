import { access } from 'node:fs/promises';
import path from 'node:path';

import { isRecord, readJson } from './json.js';
import { discoverTranslationEntries } from './manifest.js';
import type { ExtensionManifest, I18nPack, SourceCatalog } from './model.js';

export interface ValidationResult {
	files: number;
	modules: number;
	messages: number;
}

function validatePack(value: unknown, fileName: string): ValidationResult {
	if (!isRecord(value) || value.version !== '1.0.0' || !isRecord(value.contents)) {
		throw new Error(`${fileName} is not a VS Code i18n pack version 1.0.0.`);
	}
	let modules = 0;
	let messages = 0;
	for (const [moduleName, moduleMessages] of Object.entries(value.contents)) {
		if (moduleName.length === 0 || !isRecord(moduleMessages)) {
			throw new Error(`${fileName} contains an invalid module.`);
		}
		modules += 1;
		for (const [key, message] of Object.entries(moduleMessages)) {
			if (key.length === 0 || typeof message !== 'string' || message.length === 0) {
				throw new Error(`${fileName} contains an invalid message at ${moduleName}:${key}.`);
			}
			if (message.includes('\uFFFD')) {
				throw new Error(
					`${fileName} contains a Unicode replacement character at ${moduleName}:${key}.`,
				);
			}
			messages += 1;
		}
	}
	if (messages === 0) {
		throw new Error(`${fileName} does not contain any translations.`);
	}
	return { files: 1, modules, messages };
}

export async function validateProject(rootDirectory: string): Promise<ValidationResult> {
	const manifestPath = path.join(rootDirectory, 'package.json');
	const manifest = await readJson<ExtensionManifest>(manifestPath);
	const catalog = await readJson<SourceCatalog>(path.join(rootDirectory, 'catalog.json'));
	if (manifest.engines.vscode !== `^${catalog.vscodeVersion}`) {
		throw new Error('engines.vscode is not synchronized with catalog.json.');
	}
	if (catalog.languagePackFiles <= 0 || catalog.languagePackMessages <= 0) {
		throw new Error('catalog.json does not contain a valid language-pack source count.');
	}
	const localization = manifest.contributes?.localizations?.[0];
	if (!localization) {
		throw new Error('package.json does not contain a localization contribution.');
	}
	if (
		localization.languageId !== 'da' ||
		localization.languageName !== 'Danish' ||
		localization.localizedLanguageName !== 'Dansk'
	) {
		throw new Error('package.json must identify the locale as da / Danish / Dansk.');
	}
	if (localization.translations.length === 0) {
		throw new Error('package.json does not register any translation files.');
	}

	const ids = new Set<string>();
	let result: ValidationResult = { files: 0, modules: 0, messages: 0 };
	for (const entry of localization.translations) {
		if (ids.has(entry.id)) {
			throw new Error(`package.json registers ${entry.id} more than once.`);
		}
		ids.add(entry.id);
		if (!entry.path.startsWith('./translations/') || entry.path.includes('..')) {
			throw new Error(`Unsafe translation path: ${entry.path}.`);
		}
		const expectedPath =
			entry.id === 'vscode'
				? './translations/main.i18n.json'
				: `./translations/extensions/${entry.id}.i18n.json`;
		if (entry.path !== expectedPath) {
			throw new Error(`Translation ${entry.id} must use ${expectedPath}.`);
		}
		const absolutePath = path.resolve(rootDirectory, entry.path);
		await access(absolutePath);
		const pack = await readJson<I18nPack>(absolutePath);
		const validated = validatePack(pack, entry.path);
		result = {
			files: result.files + validated.files,
			modules: result.modules + validated.modules,
			messages: result.messages + validated.messages,
		};
	}
	if (!ids.has('vscode')) {
		throw new Error('package.json must register the core vscode translation pack.');
	}
	const discovered = await discoverTranslationEntries(rootDirectory);
	if (JSON.stringify(discovered) !== JSON.stringify(localization.translations)) {
		throw new Error('package.json translation entries are not synchronized with translations/.');
	}
	return result;
}
