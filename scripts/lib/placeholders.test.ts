import { describe, expect, it } from 'vitest';

import { extractPlaceholders, haveEqualPlaceholders } from './placeholders.js';

describe('placeholder validation', () => {
	it('recognizes VS Code placeholder forms', () => {
		const workspacePlaceholder = '$' + '{workspaceFolder}';
		expect(extractPlaceholders(`$(info) {1} then {0} and ${workspacePlaceholder} or %s`)).toEqual([
			'$(info)',
			workspacePlaceholder,
			'%s',
			'{0}',
			'{1}',
		]);
	});

	it('permits placeholder reordering but not removal', () => {
		expect(haveEqualPlaceholders('Move {0} to {1}', 'Flyt {1} til {0}')).toBe(true);
		expect(haveEqualPlaceholders('Open {0}', 'Åbn')).toBe(false);
	});
});
