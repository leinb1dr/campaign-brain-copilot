export type SuggestionKind = 'npc' | 'location' | 'plot_point';

export interface SourceReference {
	filePath: string;
	lineNumber: number;
	snippet: string;
}

export interface NoteDocument {
	filePath: string;
	fileName: string;
	content: string;
	lineCount: number;
}

export interface Suggestion {
	id: string;
	kind: SuggestionKind;
	value: string;
	context: string;
	source: SourceReference;
}

export interface ApprovedFact {
	id: number;
	kind: SuggestionKind;
	value: string;
	source: SourceReference;
}

export interface LocationSummary {
	id: string;
	name: string;
	sourceCount: number;
}

export interface LocationBriefing {
	id: string;
	name: string;
	sources: SourceReference[];
	relatedPlotPoints: string[];
}

export interface CampaignOverview {
	campaignName: string;
	vaultPath: string;
	notes: NoteDocument[];
	suggestions: Suggestion[];
	approvedFacts: ApprovedFact[];
	locations: LocationSummary[];
}
