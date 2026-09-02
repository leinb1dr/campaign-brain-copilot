import { browser } from '$app/environment';
import { derived, get, writable } from 'svelte/store';
import { approveSuggestion, createCampaign, loadLocationBriefing, openCampaign, openExampleCampaign } from '$lib/tauri/client';
import type { CampaignOverview, LocationBriefing, Suggestion } from '$lib/types/campaign';

const STORAGE_KEY = 'campaign-brain-last-vault';

export const campaign = writable<CampaignOverview | null>(null);
const dismissedSuggestions = writable<string[]>([]);

export const visibleSuggestions = derived([campaign, dismissedSuggestions], ([$campaign, $dismissed]) => {
	if (!$campaign) {
		return [];
	}
	const rejected = new Set($dismissed);
	return $campaign.suggestions.filter((suggestion) => !rejected.has(suggestion.id));
});

function persistVaultPath(vaultPath: string) {
	if (browser) {
		window.localStorage.setItem(STORAGE_KEY, vaultPath);
	}
}

function resetReviewState() {
	dismissedSuggestions.set([]);
}

export async function initializeCampaign() {
	if (!browser) {
		return;
	}
	const savedVaultPath = window.localStorage.getItem(STORAGE_KEY);
	if (!savedVaultPath) {
		return;
	}
	try {
		campaign.set(await openCampaign(savedVaultPath));
		resetReviewState();
	} catch {
		window.localStorage.removeItem(STORAGE_KEY);
	}
}

export async function openCampaignVault(vaultPath: string) {
	const loaded = await openCampaign(vaultPath);
	campaign.set(loaded);
	persistVaultPath(loaded.vaultPath);
	resetReviewState();
	return loaded;
}

export async function createCampaignVault(vaultPath: string) {
	const loaded = await createCampaign(vaultPath);
	campaign.set(loaded);
	persistVaultPath(loaded.vaultPath);
	resetReviewState();
	return loaded;
}

export async function openExampleVault() {
	const loaded = await openExampleCampaign();
	campaign.set(loaded);
	persistVaultPath(loaded.vaultPath);
	resetReviewState();
	return loaded;
}

export async function approveCampaignSuggestion(suggestion: Suggestion) {
	const currentCampaign = get(campaign);
	if (!currentCampaign) {
		throw new Error('Open a campaign before approving suggestions.');
	}
	const updated = await approveSuggestion(currentCampaign.vaultPath, suggestion);
	campaign.set(updated);
	return updated;
}

export function rejectCampaignSuggestion(suggestionId: string) {
	dismissedSuggestions.update((items) => (items.includes(suggestionId) ? items : [...items, suggestionId]));
}

export async function fetchLocationBriefing(locationId: string): Promise<LocationBriefing> {
	const currentCampaign = get(campaign);
	if (!currentCampaign) {
		throw new Error('Open a campaign before reviewing locations.');
	}
	return loadLocationBriefing(currentCampaign.vaultPath, locationId);
}
