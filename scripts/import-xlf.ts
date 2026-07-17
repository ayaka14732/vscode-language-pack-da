import path from 'node:path';

import { compilePacks, loadXliffInputs } from './lib/importer.js';
import { writeJsonAtomic } from './lib/json.js';
import { discoverTranslationEntries, updateManifestTranslations } from './lib/manifest.js';

function usage(): never {
	throw new Error('Usage: pnpm import:xlf -- <translated-xlf-directory> [--dry-run]');
}

const arguments_ = process.argv.slice(2);
const dryRun = arguments_.includes('--dry-run');
const inputArgument = arguments_.find((argument) => !argument.startsWith('--'));
if (!inputArgument) {
	usage();
}

const rootDirectory = process.cwd();
const inputDirectory = path.resolve(rootDirectory, inputArgument);
const inputs = await loadXliffInputs(inputDirectory);
const compiled = await compilePacks(inputs);

if (!dryRun) {
	await writeJsonAtomic(path.join(rootDirectory, 'translations/main.i18n.json'), compiled.main);
	for (const [extensionId, pack] of compiled.extensions) {
		await writeJsonAtomic(
			path.join(rootDirectory, `translations/extensions/${extensionId}.i18n.json`),
			pack,
		);
	}
	const entries = await discoverTranslationEntries(rootDirectory);
	await updateManifestTranslations(path.join(rootDirectory, 'package.json'), entries);
	await writeJsonAtomic(path.join(rootDirectory, 'reports/import-report.json'), compiled.report);
}

console.log(
	`${dryRun ? 'Checked' : 'Imported'} ${compiled.report.translated}/${compiled.report.total} strings ` +
		`(${compiled.report.coverage.toFixed(2)}%) from ${compiled.report.files} XLIFF files.`,
);
