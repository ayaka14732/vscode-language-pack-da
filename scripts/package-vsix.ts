import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const vscePath = require.resolve('@vscode/vsce/vsce');
const environment = { ...process.env };

// pnpm 11 exports this setting to child processes. npm 12 warns about it when VSCE runs the
// prepublish lifecycle, so keep the VSCE subprocess environment package-manager-neutral.
delete environment.npm_config_manage_package_manager_versions;

const exitCode = await new Promise<number>((resolve, reject) => {
	const child = spawn(
		process.execPath,
		[vscePath, 'package', '--no-dependencies', '--allow-missing-repository'],
		{
			env: environment,
			stdio: 'inherit',
		},
	);
	child.once('error', reject);
	child.once('exit', (code) => resolve(code ?? 1));
});

if (exitCode !== 0) {
	process.exitCode = exitCode;
}
