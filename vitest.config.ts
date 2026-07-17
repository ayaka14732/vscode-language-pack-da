import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		exclude: ['.cache/**', 'node_modules/**'],
		include: ['scripts/**/*.test.ts'],
	},
});
