import { test as base, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export type InvokeCall = { cmd: string; args?: Record<string, unknown> };

const fixturePath = path.join(path.dirname(fileURLToPath(import.meta.url)), 'example-campaign.json');
const exampleCampaignJson = readFileSync(fixturePath, 'utf8');

declare global {
	interface Window {
		__TAURI_INTERNALS__?: {
			invoke: (cmd: string, args?: Record<string, unknown>, options?: unknown) => Promise<unknown>;
		};
		__TAURI_INVOKE_CALLS__?: InvokeCall[];
	}
}

export const test = base.extend<{ tauri: { calls: () => Promise<InvokeCall[]> } }>({
	tauri: async ({ page }, use) => {
		await page.addInitScript((fixtureJson: string) => {
			const initial = JSON.parse(fixtureJson);
			const calls = [];
			let approvedFacts = [];
			let nextFactId = 1;

			function slugify(value) {
				let slug = '';
				let previousWasDash = false;
				for (const character of value.toLowerCase()) {
					if (/[a-z0-9]/.test(character)) {
						slug += character;
						previousWasDash = false;
					} else if (!previousWasDash) {
						slug += '-';
						previousWasDash = true;
					}
				}
				return slug.replace(/^-+|-+$/g, '');
			}

			function campaignNameFrom(vaultPath) {
				return vaultPath.split(/[\\/]/).filter(Boolean).at(-1) ?? 'Campaign Vault';
			}

			function normalizePath(value) {
				const parts = String(value ?? '')
					.split(/[\\/]/)
					.filter(Boolean);
				return parts.length === 0 ? '/' : `/${parts.join('/')}`;
			}

			function parentPath(value) {
				const parts = normalizePath(value).split('/').filter(Boolean);
				if (parts.length === 0) {
					return null;
				}
				parts.pop();
				return parts.length === 0 ? '/' : `/${parts.join('/')}`;
			}

			function ensureDirectory(value) {
				let current = '/';
				directories.add(current);
				for (const part of normalizePath(value).split('/').filter(Boolean)) {
					current = current === '/' ? `/${part}` : `${current}/${part}`;
					directories.add(current);
				}
			}

			function isVault(dir) {
				const prefix = dir === '/' ? '/' : `${dir}/`;
				return [...files].some((filePath) => filePath.startsWith(prefix) && (filePath.endsWith('.md') || filePath.endsWith('.campaign-brain.sqlite3')));
			}

			function listDirectory(path) {
				if (String(path ?? '').trim() === '::roots') {
					return {
						path: '::roots',
						parentPath: null,
						entries: [{ name: 'campaigns', path: '/campaigns', isVault: false }]
					};
				}
				const current = normalizePath(path && String(path).trim() ? path : '/campaigns');
				if (!directories.has(current)) {
					throw new Error(`Folder '${current}' does not exist.`);
				}
				const entries = [...directories]
					.filter((dir) => dir !== current && parentPath(dir) === current)
					.map((dir) => ({
						name: dir.split('/').filter(Boolean).at(-1),
						path: dir,
						isVault: isVault(dir)
					}))
					.sort((left, right) => left.name.localeCompare(right.name));
				return { path: current, parentPath: parentPath(current), entries };
			}

			function createDirectory(parent, name) {
				const folderName = String(name ?? '').trim();
				if (!folderName) {
					throw new Error('Enter a folder name.');
				}
				if (folderName.includes('/') || folderName.includes('\\')) {
					throw new Error('Folder names cannot contain path separators.');
				}
				const parentDir = normalizePath(parent);
				if (!directories.has(parentDir)) {
					throw new Error(`Folder '${parentDir}' does not exist.`);
				}
				const created = parentDir === '/' ? `/${folderName}` : `${parentDir}/${folderName}`;
				if (directories.has(created)) {
					throw new Error(`A folder named '${folderName}' already exists in '${parentDir}'.`);
				}
				directories.add(created);
				return listDirectory(created);
			}

			const directories = new Set(['/', '/campaigns', '/campaigns/harbor-notes']);
			const files = new Set(['/campaigns/harbor-notes/session-1.md']);

			function summarizeLocations(facts) {
				const grouped = new Map();
				for (const fact of facts.filter((item) => item.kind === 'location')) {
					const id = slugify(fact.value);
					const entry = grouped.get(id) ?? { name: fact.value, sourceCount: 0 };
					entry.sourceCount += 1;
					grouped.set(id, entry);
				}
				return [...grouped.entries()]
					.sort(([left], [right]) => left.localeCompare(right))
					.map(([id, location]) => ({ id, name: location.name, sourceCount: location.sourceCount }));
			}

			function buildOverview(vaultPath) {
				const approvedPairs = new Set(
					approvedFacts.map((fact) => `${fact.kind}:${fact.value.toLowerCase()}`)
				);
				return {
					...structuredClone(initial),
					campaignName: campaignNameFrom(vaultPath),
					vaultPath,
					approvedFacts: structuredClone(approvedFacts),
					suggestions: initial.suggestions.filter(
						(suggestion) => !approvedPairs.has(`${suggestion.kind}:${suggestion.value.toLowerCase()}`)
					),
					locations: summarizeLocations(approvedFacts)
				};
			}

			window.__TAURI_INVOKE_CALLS__ = calls;
			window.__TAURI_INTERNALS__ = {
				invoke: async (cmd, args) => {
					calls.push({ cmd, args });
					switch (cmd) {
						case 'list_directory':
							return listDirectory(args?.path);
						case 'create_directory':
							return createDirectory(args?.parentPath, args?.name);
						case 'open_campaign': {
							const vaultPath = normalizePath(String(args?.vaultPath ?? ''));
							if (!directories.has(vaultPath)) {
								throw new Error(`Campaign vault '${vaultPath}' does not exist.`);
							}
							return buildOverview(vaultPath);
						}
						case 'open_example_campaign':
							ensureDirectory(String(initial.vaultPath));
							return buildOverview(String(initial.vaultPath));
						case 'create_campaign': {
							const vaultPath = normalizePath(String(args?.vaultPath ?? ''));
							ensureDirectory(vaultPath);
							files.add(`${vaultPath}/session-0.md`);
							approvedFacts = [];
							nextFactId = 1;
							return buildOverview(vaultPath);
						}
						case 'approve_suggestion': {
							const suggestion = args?.suggestion;
							const duplicate = approvedFacts.some(
								(fact) =>
									fact.kind === suggestion.kind &&
									fact.value === suggestion.value &&
									fact.source.filePath === suggestion.source.filePath &&
									fact.source.lineNumber === suggestion.source.lineNumber
							);
							if (!duplicate) {
								approvedFacts.push({
									id: nextFactId,
									kind: suggestion.kind,
									value: suggestion.value,
									source: suggestion.source
								});
								nextFactId += 1;
							}
							return buildOverview(String(args?.vaultPath ?? initial.vaultPath));
						}
						case 'get_location_briefing': {
							const locationId = String(args?.locationId ?? '');
							const locationFacts = approvedFacts.filter(
								(fact) => fact.kind === 'location' && slugify(fact.value) === locationId
							);
							if (locationFacts.length === 0) {
								throw new Error(`No approved location found for id '${locationId}'.`);
							}
							const sources = locationFacts.map((fact) => fact.source);
							const notePaths = new Set(sources.map((source) => source.filePath));
							return {
								id: locationId,
								name: locationFacts[0].value,
								sources,
								relatedPlotPoints: approvedFacts
									.filter((fact) => fact.kind === 'plot_point' && notePaths.has(fact.source.filePath))
									.map((fact) => fact.value)
							};
						}
						default:
							throw new Error(`Unhandled Tauri command in Playwright stub: ${cmd}`);
					}
				}
			};
		}, exampleCampaignJson);

		await use({
			calls: async () => page.evaluate(() => window.__TAURI_INVOKE_CALLS__ ?? [])
		});
	}
});

export { expect };
