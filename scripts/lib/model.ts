export interface I18nPack {
	version: '1.0.0';
	contents: Record<string, Record<string, string>>;
}

export interface TranslationEntry {
	id: string;
	path: string;
}

export interface LocalizationContribution {
	languageId: string;
	languageName: string;
	localizedLanguageName: string;
	translations: TranslationEntry[];
}

export interface ExtensionManifest {
	name: string;
	version: string;
	publisher: string;
	engines: {
		vscode: string;
		node?: string;
	};
	contributes: {
		localizations: LocalizationContribution[];
	};
}

export interface PlaceholderMismatch {
	file: string;
	original: string;
	id: string;
	source: string;
	target: string;
	sourcePlaceholders: string[];
	targetPlaceholders: string[];
}

export interface ImportReport {
	locale: string;
	files: number;
	resources: number;
	total: number;
	translated: number;
	untranslated: number;
	coverage: number;
	mainMessages: number;
	extensionMessages: Record<string, number>;
	placeholderMismatches: PlaceholderMismatch[];
}

export interface SourceCatalog {
	vscodeVersion: string;
	commit: string;
	sourceNodeVersion: string;
	files: number;
	messages: number;
	languagePackFiles: number;
	languagePackMessages: number;
}

export interface CompiledPacks {
	main: I18nPack;
	extensions: Map<string, I18nPack>;
	report: ImportReport;
}
