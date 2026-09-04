import { beforeEach, describe, expect, it } from 'vitest';
import {
	createMockCampaign,
	createMockDirectory,
	listMockDirectory,
	openMockCampaign,
	resetMockFileSystem
} from './mockFileSystem';

describe('mockFileSystem', () => {
	beforeEach(() => {
		localStorage.clear();
		resetMockFileSystem();
	});

	it('starts at /campaigns with no child folders', () => {
		expect(listMockDirectory()).toEqual({
			path: '/campaigns',
			parentPath: '/',
			entries: []
		});
	});

	it('lists computer roots without treating them as a vault path', () => {
		expect(listMockDirectory('::roots')).toMatchObject({
			path: '::roots',
			parentPath: null
		});
		expect(listMockDirectory('::roots').entries.some((entry) => entry.name === 'campaigns')).toBe(true);
	});

	it('creates a folder, then opens it as a seeded vault', () => {
		const created = createMockDirectory('/campaigns', 'frostward');
		expect(created.path).toBe('/campaigns/frostward');
		expect(listMockDirectory('/campaigns').entries).toEqual([
			{ name: 'frostward', path: '/campaigns/frostward', isVault: false }
		]);

		const campaign = createMockCampaign('/campaigns/frostward');
		expect(campaign.campaignName).toBe('frostward');
		expect(campaign.notes[0]?.fileName).toBe('session-0.md');
		expect(listMockDirectory('/campaigns').entries[0]?.isVault).toBe(true);

		const reopened = openMockCampaign('/campaigns/frostward');
		expect(reopened.notes).toHaveLength(1);
		expect(reopened.vaultPath).toBe('/campaigns/frostward');
	});

	it('refuses to open a folder that was never created', () => {
		expect(() => openMockCampaign('/campaigns/missing')).toThrow("Campaign vault '/campaigns/missing' does not exist.");
	});

	it('rejects folder names with path separators', () => {
		expect(() => createMockDirectory('/campaigns', '../escape')).toThrow('path separators');
	});
});
