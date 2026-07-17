import { validateProject } from './lib/validation.js';

const result = await validateProject(process.cwd());
console.log(
	`Validated ${result.messages} Danish strings in ${result.modules} modules across ${result.files} files.`,
);
