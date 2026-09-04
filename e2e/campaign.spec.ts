import { expect, test } from './fixtures/tauri';

test.describe('campaign IPC', () => {
	test.beforeEach(async ({ page, tauri }) => {
		void tauri;
		await page.goto('/');
	});

	test('opens the example campaign through open_example_campaign', async ({ page, tauri }) => {
		await page.getByRole('button', { name: 'Open example campaign' }).click();

		await expect(page).toHaveURL(/\/campaign$/);
		await expect(page.getByRole('heading', { name: 'example-vault' })).toBeVisible();
		await expect(page.getByText('Pending suggestions')).toBeVisible();
		await expect(page.getByText('No canon locations yet')).toBeVisible();

		const calls = await tauri.calls();
		expect(calls.map((call) => call.cmd)).toContain('open_example_campaign');
		expect(calls.find((call) => call.cmd === 'open_example_campaign')?.args ?? {}).toEqual({});
	});

	test('opens a vault folder through open_campaign', async ({ page, tauri }) => {
		await page.getByRole('button', { name: 'Browse for a vault' }).click();
		await expect(page.getByRole('dialog', { name: 'Open a campaign vault' })).toBeVisible();
		await page.getByLabel('Go to folder').fill('/campaigns/harbor-notes');
		await page.getByRole('button', { name: 'Open path' }).click();
		await expect(page.getByText('/campaigns/harbor-notes')).toBeVisible();
		await page.getByRole('button', { name: 'Open this folder' }).click();

		await expect(page).toHaveURL(/\/campaign$/);
		await expect(page.getByRole('heading', { name: 'harbor-notes' })).toBeVisible();
		await expect(page.getByText('/campaigns/harbor-notes')).toBeVisible();

		expect(await tauri.calls()).toContainEqual({
			cmd: 'open_campaign',
			args: { vaultPath: '/campaigns/harbor-notes' }
		});
	});

	test('creates a vault folder and later opens it from existing vaults', async ({ page, tauri }) => {
		await page.getByRole('button', { name: 'Create vault' }).click();
		await expect(page.getByRole('dialog', { name: 'Create a campaign vault' })).toBeVisible();
		await page.getByLabel('New folder name').fill('frostward-campaign');
		await page.getByRole('button', { name: 'Create folder' }).click();
		await expect(page.getByText('/campaigns/frostward-campaign')).toBeVisible();
		await page.getByRole('button', { name: 'Use this folder' }).click();

		await expect(page).toHaveURL(/\/campaign$/);
		await expect(page.getByRole('heading', { name: 'frostward-campaign' })).toBeVisible();
		expect(await tauri.calls()).toContainEqual({
			cmd: 'create_directory',
			args: { parentPath: '/campaigns', name: 'frostward-campaign' }
		});
		expect(await tauri.calls()).toContainEqual({
			cmd: 'create_campaign',
			args: { vaultPath: '/campaigns/frostward-campaign' }
		});

		await page.getByRole('link', { name: 'Change vault' }).click();
		await expect(page).toHaveURL('/');
		await expect(page.getByRole('button', { name: /frostward-campaign/ })).toBeVisible();
		await page.getByRole('button', { name: /frostward-campaign/ }).click();

		await expect(page).toHaveURL(/\/campaign$/);
		await expect(page.getByRole('heading', { name: 'frostward-campaign' })).toBeVisible();
		expect(await tauri.calls()).toContainEqual({
			cmd: 'open_campaign',
			args: { vaultPath: '/campaigns/frostward-campaign' }
		});
	});

	test('reviews suggestions, approves a location, and loads its briefing', async ({ page, tauri }) => {
		await page.getByRole('button', { name: 'Open example campaign' }).click();
		await expect(page).toHaveURL(/\/campaign$/);

		await page.getByRole('link', { name: 'Suggestions Review' }).click();
		await expect(page).toHaveURL(/\/campaign\/suggestions$/);
		await expect(page.getByRole('heading', { name: 'Blackglass Wharf', exact: true })).toBeVisible();
		await expect(page.getByRole('heading', { name: 'Captain Mirel', exact: true })).toBeVisible();

		const wharfCard = page.locator('article').filter({
			has: page.getByRole('heading', { name: 'Blackglass Wharf', exact: true })
		});
		await wharfCard.getByRole('button', { name: 'Approve' }).click();
		await expect(wharfCard).toHaveCount(0);

		const approveCall = (await tauri.calls()).find((call) => call.cmd === 'approve_suggestion');
		expect(approveCall?.args).toMatchObject({
			vaultPath: '<example-vault>',
			suggestion: {
				id: 'Location:session-1.md:2:blackglass wharf',
				kind: 'location',
				value: 'Blackglass Wharf'
			}
		});

		await page.getByRole('link', { name: 'Dashboard' }).click();
		await expect(page.getByRole('link', { name: 'Blackglass Wharf', exact: true })).toBeVisible();
		await page.getByRole('link', { name: 'Blackglass Wharf', exact: true }).click();

		await expect(page).toHaveURL(/\/campaign\/location\/blackglass-wharf$/);
		await expect(page.getByRole('heading', { name: 'Blackglass Wharf', exact: true })).toBeVisible();
		await expect(page.getByText('session-1.md:2')).toBeVisible();

		expect(await tauri.calls()).toContainEqual({
			cmd: 'get_location_briefing',
			args: { vaultPath: '<example-vault>', locationId: 'blackglass-wharf' }
		});
	});
});
