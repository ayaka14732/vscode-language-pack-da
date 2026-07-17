const PLACEHOLDER_PATTERNS = [
	/\{\d+(?::[^}]*)?\}/g,
	/\$\([^)]+\)/g,
	/\$\{[^}]+\}/g,
	/%(?:\d+\$)?[sdif]/g,
] as const;

export function extractPlaceholders(message: string): string[] {
	return PLACEHOLDER_PATTERNS.flatMap((pattern) => message.match(pattern) ?? []).sort();
}

export function haveEqualPlaceholders(source: string, target: string): boolean {
	const sourcePlaceholders = extractPlaceholders(source);
	const targetPlaceholders = extractPlaceholders(target);
	return (
		sourcePlaceholders.length === targetPlaceholders.length &&
		sourcePlaceholders.every((placeholder, index) => placeholder === targetPlaceholders[index])
	);
}
