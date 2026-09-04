import { demoCampaign, demoLocationBriefing } from '$lib/demo/exampleCampaign';
import {
	createMockCampaign,
	createMockDirectory,
	ensureMockPath,
	listMockDirectory,
	openMockCampaign,
	storeMockCampaign
} from '$lib/demo/mockFileSystem';
import type { CampaignOverview, DirectoryListing, LocationBriefing, Suggestion } from '$lib/types/campaign';

const isTauriRuntime = () => typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

async function invokeCommand<T>(command: string, args?: Record<string, unknown>): Promise<T> {
	const { invoke } = await import('@tauri-apps/api/core');
	return invoke<T>(command, args);
}

function clone<T>(value: T): T {
	return JSON.parse(JSON.stringify(value)) as T;
}

function slugify(value: string) {
	return value
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/(^-|-$)/g, '');
}

export async function listDirectory(path?: string | null): Promise<DirectoryListing> {
	if (isTauriRuntime()) {
		return invokeCommand<DirectoryListing>('list_directory', { path: path ?? null });
	}
	return listMockDirectory(path);
}

export async function createDirectory(parentPath: string, name: string): Promise<DirectoryListing> {
	if (isTauriRuntime()) {
		return invokeCommand<DirectoryListing>('create_directory', { parentPath, name });
	}
	return createMockDirectory(parentPath, name);
}

export async function openCampaign(vaultPath: string): Promise<CampaignOverview> {
	if (isTauriRuntime()) {
		return invokeCommand<CampaignOverview>('open_campaign', { vaultPath });
	}
	return openMockCampaign(vaultPath);
}

export async function createCampaign(vaultPath: string): Promise<CampaignOverview> {
	if (isTauriRuntime()) {
		return invokeCommand<CampaignOverview>('create_campaign', { vaultPath });
	}
	return createMockCampaign(vaultPath);
}

export async function openExampleCampaign(): Promise<CampaignOverview> {
	if (isTauriRuntime()) {
		return invokeCommand<CampaignOverview>('open_example_campaign');
	}
	const overview = clone(demoCampaign);
	ensureMockPath(overview.vaultPath);
	storeMockCampaign(overview);
	return overview;
}

export async function approveSuggestion(vaultPath: string, suggestion: Suggestion): Promise<CampaignOverview> {
	if (isTauriRuntime()) {
		return invokeCommand<CampaignOverview>('approve_suggestion', { vaultPath, suggestion });
	}
	const current = openMockCampaign(vaultPath);
	const updated: CampaignOverview = {
		...current,
		suggestions: current.suggestions.filter((item) => item.id !== suggestion.id),
		approvedFacts: [
			...current.approvedFacts,
			{ id: current.approvedFacts.length + 1, kind: suggestion.kind, value: suggestion.value, source: suggestion.source }
		]
	};
	if (suggestion.kind === 'location' && !updated.locations.some((location) => location.name === suggestion.value)) {
		updated.locations = [
			...updated.locations,
			{ id: slugify(suggestion.value), name: suggestion.value, sourceCount: 1 }
		];
	}
	storeMockCampaign(updated);
	return clone(updated);
}

export async function loadLocationBriefing(vaultPath: string, locationId: string): Promise<LocationBriefing> {
	if (isTauriRuntime()) {
		return invokeCommand<LocationBriefing>('get_location_briefing', { vaultPath, locationId });
	}
	return {
		...clone(demoLocationBriefing),
		id: locationId,
		name: openMockCampaign(vaultPath).locations.find((location) => location.id === locationId)?.name ?? demoLocationBriefing.name
	};
}
