import { access } from 'node:fs/promises';
import path from 'node:path';

import { readJson, writeJsonAtomic } from './json.js';
import type { ExtensionManifest, TranslationEntry } from './model.js';

export async function updateManifestTranslations(
	manifestPath: string,
	entries: TranslationEntry[],
): Promise<void> {
	const manifest = await readJson<ExtensionManifest>(manifestPath);
	const localization = manifest.contributes.localizations[0];
	if (!localization) {
		throw new Error('package.json does not contain a localization contribution.');
	}
	localization.translations = entries;
	await writeJsonAtomic(manifestPath, manifest);
}

export async function discoverTranslationEntries(
	rootDirectory: string,
): Promise<TranslationEntry[]> {
	const entries: TranslationEntry[] = [];
	const mainPath = path.join(rootDirectory, 'translations/main.i18n.json');
	await access(mainPath);
	entries.push({ id: 'vscode', path: './translations/main.i18n.json' });

	const extensionDirectory = path.join(rootDirectory, 'translations/extensions');
	try {
		for await (const fileName of (await import('node:fs/promises')).glob('*.i18n.json', {
			cwd: extensionDirectory,
		})) {
			entries.push({
				id: fileName.slice(0, -'.i18n.json'.length),
				path: `./translations/extensions/${fileName}`,
			});
		}
	} catch (error) {
		if (!(error instanceof Error) || !('code' in error) || error.code !== 'ENOENT') {
			throw error;
		}
	}

	const [main, ...extensions] = entries;
	if (!main) {
		throw new Error('The core translation file is missing.');
	}
	return [main, ...extensions.sort((left, right) => left.id.localeCompare(right.id))];
}
