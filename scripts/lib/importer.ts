import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { getL10nFilesFromXlf, type l10nJsonFormat } from '@vscode/l10n-dev';

import { sortRecord } from './json.js';
import type { CompiledPacks, I18nPack, ImportReport } from './model.js';
import { collectPlaceholderMismatches, parseXliffResources } from './xliff.js';

export interface XliffInput {
	fileName: string;
	contents: string;
}

function emptyPack(): I18nPack {
	return { version: '1.0.0', contents: {} };
}

function toStringRecord(messages: l10nJsonFormat): Record<string, string> {
	return sortRecord(
		Object.fromEntries(
			Object.entries(messages).map(([key, value]) => [
				key,
				typeof value === 'string' ? value : value.message,
			]),
		),
	);
}

function mergeModule(
	pack: I18nPack,
	moduleName: string,
	messages: Record<string, string>,
	fileName: string,
): void {
	const existing = pack.contents[moduleName] ?? {};
	for (const [key, value] of Object.entries(messages)) {
		if (key in existing && existing[key] !== value) {
			throw new Error(`${fileName} defines a conflicting translation for ${moduleName}:${key}.`);
		}
	}
	pack.contents[moduleName] = sortRecord({ ...existing, ...messages });
}

function sortPack(pack: I18nPack): I18nPack {
	return {
		version: '1.0.0',
		contents: sortRecord(pack.contents),
	};
}

function countMessages(pack: I18nPack): number {
	return Object.values(pack.contents).reduce(
		(total, messages) => total + Object.keys(messages).length,
		0,
	);
}

export async function compilePacks(inputs: XliffInput[], locale = 'da'): Promise<CompiledPacks> {
	if (inputs.length === 0) {
		throw new Error('No XLIFF files were provided.');
	}

	const main = emptyPack();
	const extensions = new Map<string, I18nPack>();
	let resourcesCount = 0;
	let processedFiles = 0;
	let total = 0;
	let translated = 0;
	const placeholderMismatches = [];

	for (const input of inputs.sort((left, right) => left.fileName.localeCompare(right.fileName))) {
		if (input.fileName.replaceAll('\\', '/').split('/').includes('vscode-setup')) {
			continue;
		}
		processedFiles += 1;
		const resources = parseXliffResources(input.contents, input.fileName);
		resourcesCount += resources.length;
		for (const resource of resources) {
			if (
				resource.targetLanguage !== locale.toLowerCase() &&
				!resource.targetLanguage.startsWith(`${locale.toLowerCase()}-`)
			) {
				throw new Error(
					`${input.fileName} targets ${resource.targetLanguage}, expected ${locale}.`,
				);
			}
			total += resource.units.length;
			translated += resource.units.filter(
				(unit) => unit.target !== undefined && unit.target.length > 0,
			).length;
		}
		placeholderMismatches.push(...collectPlaceholderMismatches(resources, input.fileName));

		const localizedFiles = await getL10nFilesFromXlf(input.contents);
		for (const localizedFile of localizedFiles) {
			const normalizedName = localizedFile.name.replaceAll('\\', '/');
			if (normalizedName.startsWith('extensions/')) {
				const [, extensionId, ...moduleParts] = normalizedName.split('/');
				if (!extensionId || moduleParts.length === 0) {
					throw new Error(
						`${input.fileName} has an invalid extension resource: ${normalizedName}.`,
					);
				}
				const extensionPack = extensions.get(extensionId) ?? emptyPack();
				mergeModule(
					extensionPack,
					moduleParts.join('/'),
					toStringRecord(localizedFile.messages),
					input.fileName,
				);
				extensions.set(extensionId, extensionPack);
				continue;
			}

			const moduleName = normalizedName.startsWith('src/')
				? normalizedName.slice('src/'.length)
				: normalizedName;
			mergeModule(main, moduleName, toStringRecord(localizedFile.messages), input.fileName);
		}
	}
	if (processedFiles === 0) {
		throw new Error('No language-pack XLIFF files were provided.');
	}

	if (placeholderMismatches.length > 0) {
		const first = placeholderMismatches[0];
		throw new Error(
			`Placeholder mismatch in ${first?.file ?? 'XLIFF input'} (${first?.id ?? 'unknown unit'}).`,
		);
	}

	const sortedMain = sortPack(main);
	const sortedExtensions = new Map(
		[...extensions.entries()]
			.sort(([left], [right]) => left.localeCompare(right))
			.map(([id, pack]) => [id, sortPack(pack)]),
	);
	const extensionMessages = Object.fromEntries(
		[...sortedExtensions.entries()].map(([id, pack]) => [id, countMessages(pack)]),
	);
	const report: ImportReport = {
		locale,
		files: processedFiles,
		resources: resourcesCount,
		total,
		translated,
		untranslated: total - translated,
		coverage: total === 0 ? 0 : Number(((translated / total) * 100).toFixed(2)),
		mainMessages: countMessages(sortedMain),
		extensionMessages,
		placeholderMismatches,
	};

	return { main: sortedMain, extensions: sortedExtensions, report };
}

export async function loadXliffInputs(inputDirectory: string): Promise<XliffInput[]> {
	const matches = [];
	for await (const match of (await import('node:fs/promises')).glob('**/*.xlf', {
		cwd: inputDirectory,
	})) {
		matches.push(match);
	}
	return Promise.all(
		matches.sort().map(async (relativePath) => ({
			fileName: relativePath.replaceAll(path.sep, '/'),
			contents: await readFile(path.join(inputDirectory, relativePath), 'utf8'),
		})),
	);
}
