import { demoCampaign, demoLocationBriefing } from '$lib/demo/exampleCampaign';
import type { CampaignOverview, LocationBriefing, Suggestion } from '$lib/types/campaign';

const isTauriRuntime = () => typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

let mockCampaign: CampaignOverview | null = null;

async function invokeCommand<T>(command: string, args?: Record<string, unknown>): Promise<T> {
	const { invoke } = await import('@tauri-apps/api/core');
	return invoke<T>(command, args);
}

function clone<T>(value: T): T {
	return JSON.parse(JSON.stringify(value)) as T;
}

function ensureMockCampaign(path?: string): CampaignOverview {
	if (!mockCampaign) {
		mockCampaign = clone(demoCampaign);
	}
	if (path) {
		mockCampaign.vaultPath = path;
		mockCampaign.campaignName = path.split(/[\\/]/).filter(Boolean).at(-1) ?? 'Campaign Vault';
	}
	return clone(mockCampaign);
}

export async function openCampaign(vaultPath: string): Promise<CampaignOverview> {
	if (isTauriRuntime()) {
		return invokeCommand<CampaignOverview>('open_campaign', { vaultPath });
	}
	return ensureMockCampaign(vaultPath);
}

export async function createCampaign(vaultPath: string): Promise<CampaignOverview> {
	if (isTauriRuntime()) {
		return invokeCommand<CampaignOverview>('create_campaign', { vaultPath });
	}
	return ensureMockCampaign(vaultPath);
}

export async function openExampleCampaign(): Promise<CampaignOverview> {
	if (isTauriRuntime()) {
		return invokeCommand<CampaignOverview>('open_example_campaign');
	}
	return ensureMockCampaign('/example-vault');
}

export async function approveSuggestion(vaultPath: string, suggestion: Suggestion): Promise<CampaignOverview> {
	if (isTauriRuntime()) {
		return invokeCommand<CampaignOverview>('approve_suggestion', { vaultPath, suggestion });
	}
	const current = ensureMockCampaign(vaultPath);
	mockCampaign = {
		...current,
		suggestions: current.suggestions.filter((item) => item.id !== suggestion.id),
		approvedFacts: [
			...current.approvedFacts,
			{ id: current.approvedFacts.length + 1, kind: suggestion.kind, value: suggestion.value, source: suggestion.source }
		]
	};
	if (suggestion.kind === 'location' && !mockCampaign.locations.some((location) => location.name === suggestion.value)) {
		mockCampaign.locations = [
			...mockCampaign.locations,
			{ id: suggestion.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''), name: suggestion.value, sourceCount: 1 }
		];
	}
	return clone(mockCampaign);
}

export async function loadLocationBriefing(vaultPath: string, locationId: string): Promise<LocationBriefing> {
	if (isTauriRuntime()) {
		return invokeCommand<LocationBriefing>('get_location_briefing', { vaultPath, locationId });
	}
	return {
		...clone(demoLocationBriefing),
		id: locationId,
		name: ensureMockCampaign(vaultPath).locations.find((location) => location.id === locationId)?.name ?? demoLocationBriefing.name
	};
}
