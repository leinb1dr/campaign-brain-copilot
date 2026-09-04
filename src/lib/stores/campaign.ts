import { browser } from '$app/environment';
import { derived, get, writable } from 'svelte/store';
import {
	approveSuggestion,
	createCampaign,
	createDirectory,
	listDirectory,
	loadLocationBriefing,
	openCampaign,
	openExampleCampaign
} from '$lib/tauri/client';
import type { CampaignOverview, DirectoryListing, KnownVault, LocationBriefing, Suggestion } from '$lib/types/campaign';

const STORAGE_KEY = 'campaign-brain-last-vault';
const KNOWN_VAULTS_KEY = 'campaign-brain-known-vaults';

export const campaign = writable<CampaignOverview | null>(null);
export const knownVaults = writable<KnownVault[]>([]);
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

function persistKnownVaults(vaults: KnownVault[]) {
	knownVaults.set(vaults);
	if (browser) {
		window.localStorage.setItem(KNOWN_VAULTS_KEY, JSON.stringify(vaults));
	}
}

function loadKnownVaults() {
	if (!browser) {
		return;
	}
	const stored = window.localStorage.getItem(KNOWN_VAULTS_KEY);
	if (!stored) {
		knownVaults.set([]);
		return;
	}
	try {
		const parsed = JSON.parse(stored) as KnownVault[];
		knownVaults.set(Array.isArray(parsed) ? parsed.filter((item) => item?.path && item?.name) : []);
	} catch {
		knownVaults.set([]);
	}
}

if (browser) {
	loadKnownVaults();
}

function rememberVault(overview: CampaignOverview) {
	persistVaultPath(overview.vaultPath);
	const entry: KnownVault = { name: overview.campaignName, path: overview.vaultPath };
	const current = get(knownVaults).filter((vault) => vault.path !== entry.path);
	persistKnownVaults([entry, ...current]);
}

function forgetVault(vaultPath: string) {
	persistKnownVaults(get(knownVaults).filter((vault) => vault.path !== vaultPath));
	if (browser && window.localStorage.getItem(STORAGE_KEY) === vaultPath) {
		window.localStorage.removeItem(STORAGE_KEY);
	}
}

function resetReviewState() {
	dismissedSuggestions.set([]);
}

function applyLoadedCampaign(loaded: CampaignOverview) {
	campaign.set(loaded);
	rememberVault(loaded);
	resetReviewState();
	return loaded;
}

export async function initializeCampaign() {
	if (!browser) {
		return;
	}
	loadKnownVaults();
	const savedVaultPath = window.localStorage.getItem(STORAGE_KEY);
	if (!savedVaultPath) {
		return;
	}
	try {
		campaign.set(await openCampaign(savedVaultPath));
		rememberVault(get(campaign) as CampaignOverview);
		resetReviewState();
	} catch {
		forgetVault(savedVaultPath);
		campaign.set(null);
	}
}

export async function openCampaignVault(vaultPath: string) {
	const loaded = await openCampaign(vaultPath);
	return applyLoadedCampaign(loaded);
}

export async function createCampaignVault(vaultPath: string) {
	const loaded = await createCampaign(vaultPath);
	return applyLoadedCampaign(loaded);
}

export async function openExampleVault() {
	const loaded = await openExampleCampaign();
	return applyLoadedCampaign(loaded);
}

export async function browseDirectory(path?: string | null): Promise<DirectoryListing> {
	return listDirectory(path);
}

export async function createVaultFolder(parentPath: string, name: string): Promise<DirectoryListing> {
	return createDirectory(parentPath, name);
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
