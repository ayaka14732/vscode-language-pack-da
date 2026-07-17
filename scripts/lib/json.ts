import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';

export function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export async function readJson<T>(filePath: string): Promise<T> {
	return JSON.parse(await readFile(filePath, 'utf8')) as T;
}

export async function writeJsonAtomic(filePath: string, value: unknown): Promise<void> {
	await mkdir(path.dirname(filePath), { recursive: true });
	const temporaryPath = `${filePath}.${process.pid}.tmp`;
	await writeFile(temporaryPath, `${JSON.stringify(value, null, '\t')}\n`, 'utf8');
	await rename(temporaryPath, filePath);
}

export function sortRecord<T>(record: Record<string, T>): Record<string, T> {
	return Object.fromEntries(
		Object.entries(record).sort(([left], [right]) => left.localeCompare(right)),
	);
}
