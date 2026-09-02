import type { CampaignOverview, LocationBriefing } from '$lib/types/campaign';

export const demoCampaign: CampaignOverview = {
	campaignName: 'Example Vault',
	vaultPath: '/example-vault',
	notes: [
		{
			fileName: 'session-1.md',
			filePath: 'session-1.md',
			lineCount: 4,
			content:
				'# Session 1\nMet Captain Mirel at Blackglass Wharf.\nThe party discovered a secret tunnel beneath Old Lantern Square.\nNeed to remember the debt collector called Vargo.'
		},
		{
			fileName: 'session-2.md',
			filePath: 'session-2.md',
			lineCount: 3,
			content:
				'# Session 2\nAt Saint Branna Abbey the group found Sister Hale hiding the brass key.\nThey promised to return before the moon market.'
		},
		{
			fileName: 'session-3.md',
			filePath: 'session-3.md',
			lineCount: 3,
			content:
				'# Session 3\nIn Frostward Hollow, Mayor Orsik admitted the bridge sabotage.\nThe table decided Blackglass Wharf is where the smugglers meet.'
		}
	],
	suggestions: [
		{
			id: 'location-session-1-2-blackglass-wharf',
			kind: 'location',
			value: 'Blackglass Wharf',
			context: 'Met Captain Mirel at Blackglass Wharf.',
			source: {
				filePath: 'session-1.md',
				lineNumber: 2,
				snippet: 'Met Captain Mirel at Blackglass Wharf.'
			}
		},
		{
			id: 'npc-session-1-2-captain-mirel',
			kind: 'npc',
			value: 'Captain Mirel',
			context: 'Met Captain Mirel at Blackglass Wharf.',
			source: {
				filePath: 'session-1.md',
				lineNumber: 2,
				snippet: 'Met Captain Mirel at Blackglass Wharf.'
			}
		},
		{
			id: 'plot-session-1-3-secret-tunnel',
			kind: 'plot_point',
			value: 'The party discovered a secret tunnel beneath Old Lantern Square.',
			context: 'The party discovered a secret tunnel beneath Old Lantern Square.',
			source: {
				filePath: 'session-1.md',
				lineNumber: 3,
				snippet: 'The party discovered a secret tunnel beneath Old Lantern Square.'
			}
		},
		{
			id: 'location-session-2-2-saint-branna-abbey',
			kind: 'location',
			value: 'Saint Branna Abbey',
			context: 'At Saint Branna Abbey the group found Sister Hale hiding the brass key.',
			source: {
				filePath: 'session-2.md',
				lineNumber: 2,
				snippet: 'At Saint Branna Abbey the group found Sister Hale hiding the brass key.'
			}
		}
	],
	approvedFacts: [
		{
			id: 1,
			kind: 'location',
			value: 'Old Lantern Square',
			source: {
				filePath: 'session-1.md',
				lineNumber: 3,
				snippet: 'The party discovered a secret tunnel beneath Old Lantern Square.'
			}
		}
	],
	locations: [{ id: 'old-lantern-square', name: 'Old Lantern Square', sourceCount: 1 }]
};

export const demoLocationBriefing: LocationBriefing = {
	id: 'old-lantern-square',
	name: 'Old Lantern Square',
	sources: [
		{
			filePath: 'session-1.md',
			lineNumber: 3,
			snippet: 'The party discovered a secret tunnel beneath Old Lantern Square.'
		}
	],
	relatedPlotPoints: ['The party discovered a secret tunnel beneath Old Lantern Square.']
};
