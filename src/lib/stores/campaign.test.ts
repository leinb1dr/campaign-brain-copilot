import { get } from 'svelte/store';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CampaignOverview, Suggestion } from '$lib/types/campaign';

const openCampaign = vi.fn();
const createCampaign = vi.fn();
const openExampleCampaign = vi.fn();
const approveSuggestion = vi.fn();
const loadLocationBriefing = vi.fn();
const listDirectory = vi.fn();
const createDirectory = vi.fn();

vi.mock('$lib/tauri/client', () => ({
	openCampaign: (...args: unknown[]) => openCampaign(...args),
	createCampaign: (...args: unknown[]) => createCampaign(...args),
	openExampleCampaign: (...args: unknown[]) => openExampleCampaign(...args),
	approveSuggestion: (...args: unknown[]) => approveSuggestion(...args),
	loadLocationBriefing: (...args: unknown[]) => loadLocationBriefing(...args),
	listDirectory: (...args: unknown[]) => listDirectory(...args),
	createDirectory: (...args: unknown[]) => createDirectory(...args)
}));

import {
	approveCampaignSuggestion,
	browseDirectory,
	campaign,
	createCampaignVault,
	createVaultFolder,
	initializeCampaign,
	knownVaults,
	openCampaignVault,
	openExampleVault,
	rejectCampaignSuggestion,
	visibleSuggestions
} from './campaign';

const STORAGE_KEY = 'campaign-brain-last-vault';
const KNOWN_VAULTS_KEY = 'campaign-brain-known-vaults';

const wharf: Suggestion = {
	id: 'Location:session-1.md:2:blackglass wharf',
	kind: 'location',
	value: 'Blackglass Wharf',
	context: '- Met Captain Mirel at Blackglass Wharf after the rain quit.',
	source: {
		filePath: 'session-1.md',
		lineNumber: 2,
		snippet: '- Met Captain Mirel at Blackglass Wharf after the rain quit.'
	}
};

const captain: Suggestion = {
	id: 'Npc:session-1.md:2:captain mirel',
	kind: 'npc',
	value: 'Captain Mirel',
	context: '- Met Captain Mirel at Blackglass Wharf after the rain quit.',
	source: {
		filePath: 'session-1.md',
		lineNumber: 2,
		snippet: '- Met Captain Mirel at Blackglass Wharf after the rain quit.'
	}
};

function sampleCampaign(overrides: Partial<CampaignOverview> = {}): CampaignOverview {
	return {
		campaignName: 'example-vault',
		vaultPath: '/tmp/example-vault',
		notes: [],
		suggestions: [wharf, captain],
		approvedFacts: [],
		locations: [],
		...overrides
	};
}

describe('campaign store', () => {
	beforeEach(async () => {
		localStorage.clear();
		vi.clearAllMocks();
		campaign.set(null);
		knownVaults.set([]);
		openCampaign.mockResolvedValue(sampleCampaign());
		await openCampaignVault('/tmp/example-vault');
	});

	it('filters dismissed ids out of visibleSuggestions', () => {
		expect(get(visibleSuggestions).map((suggestion) => suggestion.id)).toEqual([wharf.id, captain.id]);

		rejectCampaignSuggestion(wharf.id);

		expect(get(visibleSuggestions).map((suggestion) => suggestion.id)).toEqual([captain.id]);
		expect(get(campaign)?.suggestions.map((suggestion) => suggestion.id)).toEqual([wharf.id, captain.id]);
	});

	it('does not record the same rejection twice', () => {
		rejectCampaignSuggestion(wharf.id);
		rejectCampaignSuggestion(wharf.id);

		expect(get(visibleSuggestions)).toHaveLength(1);
	});

	it('clears local rejections when a vault is opened', async () => {
		rejectCampaignSuggestion(wharf.id);
		expect(get(visibleSuggestions)).toHaveLength(1);

		openCampaign.mockResolvedValue(sampleCampaign());
		await openCampaignVault('/tmp/example-vault');

		expect(get(visibleSuggestions)).toHaveLength(2);
	});

	it('persists the loaded vault path and known vaults', async () => {
		expect(localStorage.getItem(STORAGE_KEY)).toBe('/tmp/example-vault');
		expect(JSON.parse(localStorage.getItem(KNOWN_VAULTS_KEY) ?? '[]')).toEqual([
			{ name: 'example-vault', path: '/tmp/example-vault' }
		]);

		openCampaign.mockResolvedValue(sampleCampaign({ vaultPath: '/campaigns/harbor', campaignName: 'harbor' }));
		await openCampaignVault('/ignored-argument');

		expect(localStorage.getItem(STORAGE_KEY)).toBe('/campaigns/harbor');
		expect(openCampaign).toHaveBeenCalledWith('/ignored-argument');
		expect(JSON.parse(localStorage.getItem(KNOWN_VAULTS_KEY) ?? '[]')).toEqual([
			{ name: 'harbor', path: '/campaigns/harbor' },
			{ name: 'example-vault', path: '/tmp/example-vault' }
		]);
	});

	it('reopens the saved vault on initializeCampaign', async () => {
		campaign.set(null);
		localStorage.setItem(STORAGE_KEY, '/saved/vault');
		openCampaign.mockResolvedValue(sampleCampaign({ vaultPath: '/saved/vault', campaignName: 'vault' }));

		await initializeCampaign();

		expect(openCampaign).toHaveBeenCalledWith('/saved/vault');
		expect(get(campaign)?.vaultPath).toBe('/saved/vault');
	});

	it('forgets a saved vault when reopen fails', async () => {
		campaign.set(null);
		localStorage.setItem(STORAGE_KEY, '/missing/vault');
		localStorage.setItem(
			KNOWN_VAULTS_KEY,
			JSON.stringify([{ name: 'vault', path: '/missing/vault' }])
		);
		openCampaign.mockRejectedValue(new Error('Campaign vault does not exist.'));

		await initializeCampaign();

		expect(get(campaign)).toBeNull();
		expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
		expect(get(knownVaults)).toEqual([]);
	});

	it('stores the example campaign path after openExampleVault', async () => {
		openExampleCampaign.mockResolvedValue(sampleCampaign({ vaultPath: '/example-vault' }));

		await openExampleVault();

		expect(openExampleCampaign).toHaveBeenCalledOnce();
		expect(localStorage.getItem(STORAGE_KEY)).toBe('/example-vault');
		expect(get(campaign)?.vaultPath).toBe('/example-vault');
		expect(get(knownVaults)[0]).toEqual({ name: 'example-vault', path: '/example-vault' });
	});

	it('remembers a created vault so it can be opened later', async () => {
		createCampaign.mockResolvedValue(
			sampleCampaign({ vaultPath: '/campaigns/frostward', campaignName: 'frostward', notes: [], suggestions: [] })
		);

		await createCampaignVault('/campaigns/frostward');

		expect(createCampaign).toHaveBeenCalledWith('/campaigns/frostward');
		expect(get(campaign)?.campaignName).toBe('frostward');
		expect(get(knownVaults)[0]).toEqual({ name: 'frostward', path: '/campaigns/frostward' });
	});

	it('browses and creates folders through the client', async () => {
		const listing = {
			path: '/campaigns/new-vault',
			parentPath: '/campaigns',
			entries: []
		};
		listDirectory.mockResolvedValue({ path: '/campaigns', parentPath: '/', entries: [] });
		createDirectory.mockResolvedValue(listing);

		await expect(browseDirectory()).resolves.toMatchObject({ path: '/campaigns' });
		await expect(createVaultFolder('/campaigns', 'new-vault')).resolves.toEqual(listing);
		expect(listDirectory).toHaveBeenCalledWith(undefined);
		expect(createDirectory).toHaveBeenCalledWith('/campaigns', 'new-vault');
	});

	it('approves through the client and replaces campaign state', async () => {
		const updated = sampleCampaign({
			suggestions: [captain],
			approvedFacts: [{ id: 1, kind: wharf.kind, value: wharf.value, source: wharf.source }],
			locations: [{ id: 'blackglass-wharf', name: 'Blackglass Wharf', sourceCount: 1 }]
		});
		approveSuggestion.mockResolvedValue(updated);

		await approveCampaignSuggestion(wharf);

		expect(approveSuggestion).toHaveBeenCalledWith('/tmp/example-vault', wharf);
		expect(get(campaign)?.locations).toEqual(updated.locations);
		expect(get(visibleSuggestions).map((suggestion) => suggestion.id)).toEqual([captain.id]);
	});

	it('refuses to approve when no campaign is open', async () => {
		campaign.set(null);
		await expect(approveCampaignSuggestion(wharf)).rejects.toThrow(
			'Open a campaign before approving suggestions.'
		);
	});
});
