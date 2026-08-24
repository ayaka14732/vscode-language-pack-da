const NUMERIC_CHARACTER_REFERENCE = /&#(?:x([\da-f]+)|(\d+));/gi;

export function decodeXmlNumericCharacterReferences(value: string): string {
	return value.replace(
		NUMERIC_CHARACTER_REFERENCE,
		(reference, hexadecimal: string | undefined, decimal: string | undefined) => {
			const codePoint = Number.parseInt(hexadecimal ?? decimal ?? '', hexadecimal ? 16 : 10);
			return Number.isSafeInteger(codePoint) && codePoint <= 0x10ffff
				? String.fromCodePoint(codePoint)
				: reference;
		},
	);
}
