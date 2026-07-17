import path from 'node:path';

import { readJson } from './lib/json.js';
import type { ExtensionManifest, I18nPack, ImportReport, SourceCatalog } from './lib/model.js';

const rootDirectory = process.cwd();
const manifest = await readJson<ExtensionManifest>(path.join(rootDirectory, 'package.json'));
const localization = manifest.contributes.localizations[0];
if (!localization) {
	throw new Error('package.json does not contain a localization contribution.');
}

const rows = [];
let packagedMessages = 0;
for (const entry of localization.translations) {
	const pack = await readJson<I18nPack>(path.resolve(rootDirectory, entry.path));
	const messages = Object.values(pack.contents).reduce(
		(total, moduleMessages) => total + Object.keys(moduleMessages).length,
		0,
	);
	packagedMessages += messages;
	rows.push({
		resource: entry.id,
		modules: Object.keys(pack.contents).length,
		messages,
	});
}
console.table(rows);

try {
	const report = await readJson<ImportReport>(
		path.join(rootDirectory, 'reports/import-report.json'),
	);
	console.log(
		`Latest XLIFF import coverage: ${report.translated}/${report.total} (${report.coverage.toFixed(2)}%).`,
	);
} catch (error) {
	if (!(error instanceof Error) || !('code' in error) || error.code !== 'ENOENT') {
		throw error;
	}
	const catalog = await readJson<SourceCatalog>(path.join(rootDirectory, 'catalog.json'));
	const coverage = (packagedMessages / catalog.languagePackMessages) * 100;
	console.log(
		`Current catalog coverage: ${packagedMessages}/${catalog.languagePackMessages} ` +
			`(${coverage.toFixed(2)}%). No XLIFF import report is available yet.`,
	);
}
