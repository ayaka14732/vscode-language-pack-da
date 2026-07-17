import { execFileSync, spawn } from 'node:child_process';
import { access, glob, mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { readJson, writeJsonAtomic } from './lib/json.js';
import type { ExtensionManifest } from './lib/model.js';

async function exists(filePath: string): Promise<boolean> {
	try {
		await access(filePath);
		return true;
	} catch {
		return false;
	}
}

async function run(command: string, arguments_: string[], workingDirectory: string): Promise<void> {
	const environment = { ...process.env };
	delete environment.npm_config_manage_package_manager_versions;
	await new Promise<void>((resolve, reject) => {
		const child = spawn(command, arguments_, {
			cwd: workingDirectory,
			env: environment,
			stdio: 'inherit',
		});
		child.once('error', reject);
		child.once('exit', (code, signal) => {
			if (code === 0) {
				resolve();
				return;
			}
			reject(new Error(`${command} exited with ${code ?? signal ?? 'an unknown status'}.`));
		});
	});
}

function npmCliPath(workingDirectory: string): string {
	const globalNodeModules = execFileSync('npm', ['root', '--global'], {
		cwd: workingDirectory,
		encoding: 'utf8',
	}).trim();
	return path.join(globalNodeModules, 'npm/bin/npm-cli.js');
}

const rootDirectory = process.cwd();
const manifest = await readJson<ExtensionManifest>(path.join(rootDirectory, 'package.json'));
const configuredVersion = manifest.engines.vscode.replace(/^[^\d]*/, '');
const refArgument = process.argv.slice(2).find((argument) => argument.startsWith('--ref='));
const ref = refArgument?.slice('--ref='.length) || configuredVersion;
if (!/^\d+\.\d+\.\d+$/.test(ref)) {
	throw new Error(`Invalid VS Code release ref: ${ref}.`);
}

const cacheDirectory = path.join(
	process.env.XDG_CACHE_HOME ?? path.join(os.homedir(), '.cache'),
	'vscode-language-pack-da',
);
const sourceRoot = path.join(cacheDirectory, 'sources', ref);
const checkoutDirectory = path.join(sourceRoot, 'vscode');
const exportDirectory = path.join(sourceRoot, 'vscode-translations-export');
await mkdir(sourceRoot, { recursive: true });

const hasGitDirectory = await exists(path.join(checkoutDirectory, '.git'));
const hasPackageManifest = await exists(path.join(checkoutDirectory, 'package.json'));
if (hasGitDirectory && !hasPackageManifest) {
	const incompleteDirectory = `${checkoutDirectory}.incomplete-${Date.now()}`;
	await rename(checkoutDirectory, incompleteDirectory);
	console.warn(`Preserved incomplete checkout at ${incompleteDirectory}.`);
}

if (!hasGitDirectory || !hasPackageManifest) {
	await run(
		'git',
		[
			'-c',
			'filter.lfs.process=',
			'-c',
			'filter.lfs.smudge=',
			'-c',
			'filter.lfs.required=false',
			'clone',
			'--branch',
			ref,
			'--depth=1',
			'--filter=blob:none',
			'https://github.com/microsoft/vscode.git',
			checkoutDirectory,
		],
		rootDirectory,
	);
}

const sourceNodeVersion = (await readFile(path.join(checkoutDirectory, '.nvmrc'), 'utf8')).trim();
if (!/^\d+\.\d+\.\d+$/.test(sourceNodeVersion)) {
	throw new Error(`Invalid VS Code .nvmrc version: ${sourceNodeVersion}.`);
}
const npmCli = npmCliPath(checkoutDirectory);
const sourceNode = [`node@${sourceNodeVersion}`, npmCli];
const installMarker = path.join(checkoutDirectory, `.lang-pack-install-${sourceNodeVersion}`);
if (!(await exists(installMarker))) {
	await run('pnpm', ['dlx', ...sourceNode, 'ci'], checkoutDirectory);
	await writeFile(installMarker, 'complete\n', 'utf8');
}
await run(
	'pnpm',
	['dlx', ...sourceNode, 'run', 'gulp', 'vscode-translations-export'],
	checkoutDirectory,
);

let files = 0;
let messages = 0;
let languagePackFiles = 0;
let languagePackMessages = 0;
for await (const relativePath of glob('**/*.xlf', { cwd: exportDirectory })) {
	files += 1;
	const contents = await readFile(path.join(exportDirectory, relativePath), 'utf8');
	const messageCount = contents.match(/<trans-unit\b/g)?.length ?? 0;
	messages += messageCount;
	if (!relativePath.replaceAll('\\', '/').split('/').includes('vscode-setup')) {
		languagePackFiles += 1;
		languagePackMessages += messageCount;
	}
}
const commit = execFileSync('git', ['rev-parse', 'HEAD'], {
	cwd: checkoutDirectory,
	encoding: 'utf8',
}).trim();
await writeJsonAtomic(path.join(rootDirectory, 'catalog.json'), {
	vscodeVersion: ref,
	commit,
	sourceNodeVersion,
	files,
	messages,
	languagePackFiles,
	languagePackMessages,
});
console.log(
	`English XLIFF source exported to ${exportDirectory}: ` +
		`${languagePackFiles} language-pack files, ${languagePackMessages} messages ` +
		`(${files} files including the Windows installer catalog).`,
);
