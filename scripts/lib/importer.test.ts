import { describe, expect, it } from 'vitest';

import { compilePacks } from './importer.js';

const validXliff = `<?xml version="1.0" encoding="utf-8"?>
<xliff version="1.2" xmlns="urn:oasis:names:tc:xliff:document:1.2">
  <file original="src/vs/base/test" source-language="en" target-language="da" datatype="plaintext">
    <body>
      <trans-unit id="open"><source xml:lang="en">Open {0}</source><target>Åbn {0}</target></trans-unit>
      <trans-unit id="missing"><source xml:lang="en">Missing</source></trans-unit>
    </body>
  </file>
  <file original="extensions/vscode.git/bundle" source-language="en" target-language="da" datatype="plaintext">
    <body>
      <trans-unit id="changes"><source xml:lang="en">Changes</source><target>Ændringer</target></trans-unit>
    </body>
  </file>
</xliff>`;

const setupXliff = `<?xml version="1.0" encoding="utf-8"?>
<xliff version="1.2" xmlns="urn:oasis:names:tc:xliff:document:1.2">
  <file original="installer" source-language="en" datatype="plaintext">
    <body><trans-unit id="install"><source xml:lang="en">Install</source></trans-unit></body>
  </file>
</xliff>`;

describe('compilePacks', () => {
	it('builds deterministic core and extension packs', async () => {
		const compiled = await compilePacks([{ fileName: 'sample.xlf', contents: validXliff }]);

		expect(compiled.main.contents).toEqual({
			'vs/base/test': { open: 'Åbn {0}' },
		});
		expect(compiled.extensions.get('vscode.git')?.contents).toEqual({
			bundle: { changes: 'Ændringer' },
		});
		expect(compiled.report).toMatchObject({
			files: 1,
			resources: 2,
			total: 3,
			translated: 2,
			untranslated: 1,
			coverage: 66.67,
		});
	});

	it('rejects placeholder loss', async () => {
		const invalid = validXliff.replace('Åbn {0}', 'Åbn');
		await expect(compilePacks([{ fileName: 'invalid.xlf', contents: invalid }])).rejects.toThrow(
			'Placeholder mismatch',
		);
	});

	it('rejects a different target language', async () => {
		const invalid = validXliff.replaceAll('target-language="da"', 'target-language="sv"');
		await expect(compilePacks([{ fileName: 'swedish.xlf', contents: invalid }])).rejects.toThrow(
			'expected da',
		);
	});

	it('ignores the separate Windows installer catalog', async () => {
		const compiled = await compilePacks([
			{ fileName: 'vscode-editor/da/core.xlf', contents: validXliff },
			{ fileName: 'vscode-setup/da/messages.xlf', contents: setupXliff },
		]);
		expect(compiled.report.files).toBe(1);
		expect(compiled.report.total).toBe(3);
	});
});
