import { readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { XMLParser } from 'fast-xml-parser';

import { isRecord, readJson, sortRecord, writeJsonAtomic } from './lib/json.js';
import { discoverTranslationEntries, updateManifestTranslations } from './lib/manifest.js';
import type { ExtensionManifest, I18nPack } from './lib/model.js';
import { haveEqualPlaceholders } from './lib/placeholders.js';

interface SourceUnit {
	id: string;
	source: string;
}

interface SourceResource {
	original: string;
	units: SourceUnit[];
}

const parser = new XMLParser({
	attributeNamePrefix: '@_',
	ignoreAttributes: false,
	isArray: (name) => name === 'file' || name === 'trans-unit',
	parseAttributeValue: false,
	parseTagValue: false,
	processEntities: true,
	trimValues: false,
});

function asArray(value: unknown): unknown[] {
	if (value === undefined) {
		return [];
	}
	return Array.isArray(value) ? value : [value];
}

function textValue(value: unknown): string | undefined {
	if (typeof value === 'string') {
		return value;
	}
	if (typeof value === 'number' || typeof value === 'boolean') {
		return String(value);
	}
	if (Array.isArray(value)) {
		return value
			.map(textValue)
			.filter((part): part is string => part !== undefined)
			.join('');
	}
	if (!isRecord(value)) {
		return undefined;
	}
	if ('#text' in value) {
		return textValue(value['#text']);
	}
	return Object.entries(value)
		.filter(([key]) => !key.startsWith('@_'))
		.map(([, child]) => textValue(child))
		.filter((part): part is string => part !== undefined)
		.join('');
}

function parseSourceResources(xml: string, fileName: string): SourceResource[] {
	const document = parser.parse(xml) as unknown;
	if (!isRecord(document) || !isRecord(document.xliff)) {
		throw new Error(`${fileName} does not contain an <xliff> document.`);
	}
	return asArray(document.xliff.file).map((fileNode, fileIndex) => {
		if (!isRecord(fileNode) || typeof fileNode['@_original'] !== 'string') {
			throw new Error(`${fileName} contains an invalid <file> node at #${fileIndex + 1}.`);
		}
		if (!isRecord(fileNode.body)) {
			throw new Error(`${fileName} file #${fileIndex + 1} does not contain a <body> node.`);
		}
		const units = asArray(fileNode.body['trans-unit']).map((unitNode, unitIndex) => {
			if (!isRecord(unitNode) || typeof unitNode['@_id'] !== 'string') {
				throw new Error(`${fileName} contains an invalid unit at #${unitIndex + 1}.`);
			}
			const source = textValue(unitNode.source);
			if (source === undefined) {
				throw new Error(`${fileName} unit ${unitNode['@_id']} does not contain source text.`);
			}
			return { id: unitNode['@_id'], source };
		});
		return { original: fileNode['@_original'], units };
	});
}

function emptyPack(): I18nPack {
	return { version: '1.0.0', contents: {} };
}

function resourceLocation(original: string): { packId: string; moduleName: string } {
	const normalized = original.replaceAll('\\', '/');
	if (normalized.startsWith('extensions/')) {
		const [, extensionId, ...moduleParts] = normalized.split('/');
		if (!extensionId || moduleParts.length === 0) {
			throw new Error(`Invalid extension resource: ${original}.`);
		}
		return { packId: extensionId, moduleName: moduleParts.join('/') };
	}
	return {
		packId: 'vscode',
		moduleName: normalized.startsWith('src/') ? normalized.slice('src/'.length) : normalized,
	};
}

const rootDirectory = process.cwd();
const manifestPath = path.join(rootDirectory, 'package.json');
const manifest = await readJson<ExtensionManifest>(manifestPath);
const catalogVersion = manifest.engines.vscode.replace(/^[^\d]*/, '');
const sourceDirectory = path.resolve(
	process.argv.slice(2).find((argument) => !argument.startsWith('--')) ??
		path.join(
			process.env.XDG_CACHE_HOME ?? path.join(os.homedir(), '.cache'),
			'vscode-language-pack-da',
			'sources',
			catalogVersion,
			'vscode-translations-export',
		),
);
const memory = await readJson<Record<string, string>>(
	path.join(rootDirectory, 'scripts/data/translation-memory.da.json'),
);

const packs = new Map<string, I18nPack>();
for (const entry of manifest.contributes.localizations[0]?.translations ?? []) {
	packs.set(entry.id, await readJson<I18nPack>(path.resolve(rootDirectory, entry.path)));
}
packs.set('vscode', packs.get('vscode') ?? emptyPack());

let sourceFiles = 0;
let sourceMessages = 0;
let added = 0;
const usedMemory = new Set<string>();
const mismatches: string[] = [];

for await (const relativePath of (await import('node:fs/promises')).glob('**/*.xlf', {
	cwd: sourceDirectory,
})) {
	const normalizedPath = relativePath.replaceAll(path.sep, '/');
	if (normalizedPath.split('/').includes('vscode-setup')) {
		continue;
	}
	sourceFiles += 1;
	const resources = parseSourceResources(
		await readFile(path.join(sourceDirectory, relativePath), 'utf8'),
		normalizedPath,
	);
	for (const resource of resources) {
		const { packId, moduleName } = resourceLocation(resource.original);
		const pack = packs.get(packId) ?? emptyPack();
		const moduleMessages = { ...(pack.contents[moduleName] ?? {}) };
		for (const unit of resource.units) {
			sourceMessages += 1;
			if (unit.id in moduleMessages) {
				continue;
			}
			if (!Object.hasOwn(memory, unit.source)) {
				continue;
			}
			const target = memory[unit.source];
			if (typeof target !== 'string') {
				throw new Error(`Translation-memory value for ${unit.source} is not a string.`);
			}
			if (!haveEqualPlaceholders(unit.source, target)) {
				mismatches.push(`${resource.original}:${unit.id}`);
				continue;
			}
			moduleMessages[unit.id] = target;
			usedMemory.add(unit.source);
			added += 1;
		}
		if (Object.keys(moduleMessages).length > 0) {
			pack.contents[moduleName] = sortRecord(moduleMessages);
			packs.set(packId, pack);
		}
	}
}

if (mismatches.length > 0) {
	throw new Error(`Translation-memory placeholder mismatch at ${mismatches[0]}.`);
}

for (const [packId, pack] of [...packs].sort(([left], [right]) => left.localeCompare(right))) {
	const sortedPack: I18nPack = {
		version: '1.0.0',
		contents: sortRecord(pack.contents),
	};
	const outputPath =
		packId === 'vscode'
			? path.join(rootDirectory, 'translations/main.i18n.json')
			: path.join(rootDirectory, `translations/extensions/${packId}.i18n.json`);
	await writeJsonAtomic(outputPath, sortedPack);
}

const entries = await discoverTranslationEntries(rootDirectory);
await updateManifestTranslations(manifestPath, entries);

console.log(
	`Applied ${usedMemory.size}/${Object.keys(memory).length} translation-memory entries: ` +
		`${added} new strings across ${packs.size} packs from ${sourceFiles} XLIFF files ` +
		`(${sourceMessages} source messages).`,
);
