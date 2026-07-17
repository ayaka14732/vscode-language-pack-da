import { XMLParser } from 'fast-xml-parser';

import { isRecord } from './json.js';
import type { PlaceholderMismatch } from './model.js';
import { extractPlaceholders, haveEqualPlaceholders } from './placeholders.js';

interface XliffUnit {
	id: string;
	source: string;
	target?: string;
}

interface XliffResource {
	original: string;
	targetLanguage: string;
	units: XliffUnit[];
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
	const textParts = Object.entries(value)
		.filter(([key]) => !key.startsWith('@_'))
		.map(([, child]) => textValue(child))
		.filter((part): part is string => part !== undefined);
	return textParts.length > 0 ? textParts.join('') : '';
}

function requiredString(record: Record<string, unknown>, key: string, context: string): string {
	const value = record[key];
	if (typeof value !== 'string' || value.length === 0) {
		throw new Error(`${context} is missing ${key}.`);
	}
	return value;
}

export function parseXliffResources(xml: string, fileName: string): XliffResource[] {
	const document = parser.parse(xml) as unknown;
	if (!isRecord(document) || !isRecord(document.xliff)) {
		throw new Error(`${fileName} does not contain an <xliff> document.`);
	}

	return asArray(document.xliff.file).map((fileNode, fileIndex) => {
		if (!isRecord(fileNode)) {
			throw new Error(`${fileName} contains an invalid <file> node.`);
		}
		const context = `${fileName} file #${fileIndex + 1}`;
		const original = requiredString(fileNode, '@_original', context);
		const targetLanguage = requiredString(fileNode, '@_target-language', context).toLowerCase();
		if (!isRecord(fileNode.body)) {
			throw new Error(`${context} does not contain a <body> node.`);
		}

		const units = asArray(fileNode.body['trans-unit']).map((unitNode, unitIndex) => {
			if (!isRecord(unitNode)) {
				throw new Error(`${context} contains an invalid <trans-unit> node.`);
			}
			const unitContext = `${context} unit #${unitIndex + 1}`;
			const id = requiredString(unitNode, '@_id', unitContext);
			const source = textValue(unitNode.source);
			if (source === undefined) {
				throw new Error(`${unitContext} does not contain a <source> node.`);
			}
			const target = unitNode.target === undefined ? undefined : textValue(unitNode.target);
			return { id, source, ...(target === undefined ? {} : { target }) };
		});

		return { original, targetLanguage, units };
	});
}

export function collectPlaceholderMismatches(
	resources: XliffResource[],
	fileName: string,
): PlaceholderMismatch[] {
	const mismatches: PlaceholderMismatch[] = [];
	for (const resource of resources) {
		for (const unit of resource.units) {
			if (unit.target === undefined || unit.target.length === 0) {
				continue;
			}
			if (!haveEqualPlaceholders(unit.source, unit.target)) {
				mismatches.push({
					file: fileName,
					original: resource.original,
					id: unit.id,
					source: unit.source,
					target: unit.target,
					sourcePlaceholders: extractPlaceholders(unit.source),
					targetPlaceholders: extractPlaceholders(unit.target),
				});
			}
		}
	}
	return mismatches;
}
