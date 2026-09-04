import type { CampaignOverview, DirectoryListing } from '$lib/types/campaign';

export const MOCK_VAULT_ROOT = '/campaigns';

const MOCK_FS_KEY = 'campaign-brain-mock-fs';
const MOCK_CAMPAIGNS_KEY = 'campaign-brain-mock-campaigns';

const STARTER_NOTE = `# Session 0
- Name the first settlement.
- Decide who owes the party a favor.
- Leave yourself messy notes; Campaign Brain will organize the canon later.
`;

interface MockNode {
	dirs: Record<string, MockNode>;
	files: Record<string, string>;
}

function emptyNode(): MockNode {
	return { dirs: {}, files: {} };
}

function defaultTree(): MockNode {
	return {
		dirs: {
			campaigns: emptyNode()
		},
		files: {}
	};
}

let root = defaultTree();
const mockCampaigns = new Map<string, CampaignOverview>();

function canUseStorage() {
	return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function persist() {
	if (!canUseStorage()) {
		return;
	}
	window.localStorage.setItem(MOCK_FS_KEY, JSON.stringify(root));
	window.localStorage.setItem(
		MOCK_CAMPAIGNS_KEY,
		JSON.stringify([...mockCampaigns.entries()])
	);
}

function hydrate() {
	if (!canUseStorage()) {
		return;
	}
	const storedTree = window.localStorage.getItem(MOCK_FS_KEY);
	if (storedTree) {
		try {
			root = JSON.parse(storedTree) as MockNode;
		} catch {
			root = defaultTree();
		}
	}
	const storedCampaigns = window.localStorage.getItem(MOCK_CAMPAIGNS_KEY);
	if (storedCampaigns) {
		try {
			const entries = JSON.parse(storedCampaigns) as [string, CampaignOverview][];
			mockCampaigns.clear();
			for (const [path, overview] of entries) {
				mockCampaigns.set(normalizePath(path), overview);
			}
		} catch {
			mockCampaigns.clear();
		}
	}
}

hydrate();

export function resetMockFileSystem() {
	root = defaultTree();
	mockCampaigns.clear();
	if (canUseStorage()) {
		window.localStorage.removeItem(MOCK_FS_KEY);
		window.localStorage.removeItem(MOCK_CAMPAIGNS_KEY);
	}
}

export function normalizePath(path: string) {
	const parts = path.split(/[\\/]/).filter(Boolean);
	return parts.length === 0 ? '/' : `/${parts.join('/')}`;
}

function pathParts(path: string) {
	return normalizePath(path).split('/').filter(Boolean);
}

function joinPath(parent: string, name: string) {
	const normalized = normalizePath(parent);
	return normalized === '/' ? `/${name}` : `${normalized}/${name}`;
}

function getNode(path: string): MockNode | null {
	const normalized = normalizePath(path);
	if (normalized === '/') {
		return root;
	}
	let node: MockNode = root;
	for (const part of pathParts(normalized)) {
		const next = node.dirs[part];
		if (!next) {
			return null;
		}
		node = next;
	}
	return node;
}

function ensureDir(path: string): MockNode {
	let node = root;
	for (const part of pathParts(path)) {
		if (!node.dirs[part]) {
			node.dirs[part] = emptyNode();
		}
		node = node.dirs[part];
	}
	return node;
}

function parentPath(path: string): string | null {
	const parts = pathParts(path);
	if (parts.length === 0) {
		return null;
	}
	parts.pop();
	return parts.length === 0 ? '/' : `/${parts.join('/')}`;
}

function isVaultNode(node: MockNode) {
	return Object.keys(node.files).some((fileName) => fileName.endsWith('.md') || fileName === '.campaign-brain.sqlite3');
}

export function validateFolderName(name: string) {
	const folderName = name.trim();
	if (folderName.includes('/') || folderName.includes('\\') || folderName.includes('\0')) {
		throw new Error('Folder names cannot contain path separators.');
	}
	if (!folderName) {
		throw new Error('Enter a folder name.');
	}
	if (folderName === '.' || folderName === '..' || folderName.startsWith('.')) {
		throw new Error('That folder name is not allowed.');
	}
	return folderName;
}

function listingFor(path: string): DirectoryListing {
	const normalized = normalizePath(path);
	const node = getNode(normalized);
	if (!node) {
		throw new Error(`Folder '${normalized}' does not exist.`);
	}
	const entries = Object.keys(node.dirs)
		.sort((left, right) => left.localeCompare(right, undefined, { sensitivity: 'base' }))
		.map((name) => {
			const childPath = joinPath(normalized, name);
			return {
				name,
				path: childPath,
				isVault: isVaultNode(node.dirs[name])
			};
		});
	return {
		path: normalized,
		parentPath: parentPath(normalized),
		entries
	};
}

export function listMockDirectory(path?: string | null): DirectoryListing {
	return listingFor(path && path.trim() ? path : MOCK_VAULT_ROOT);
}

export function createMockDirectory(parentPathValue: string, name: string): DirectoryListing {
	const folderName = validateFolderName(name);
	const parent = getNode(parentPathValue);
	if (!parent) {
		throw new Error(`Folder '${normalizePath(parentPathValue)}' does not exist.`);
	}
	if (parent.dirs[folderName]) {
		throw new Error(
			`A folder named '${folderName}' already exists in '${normalizePath(parentPathValue)}'.`
		);
	}
	parent.dirs[folderName] = emptyNode();
	const created = joinPath(parentPathValue, folderName);
	persist();
	return listingFor(created);
}

function campaignNameFrom(vaultPath: string) {
	return pathParts(vaultPath).at(-1) ?? 'Campaign Vault';
}

function overviewFromNode(vaultPath: string, node: MockNode): CampaignOverview {
	const notes = Object.entries(node.files)
		.filter(([fileName]) => fileName.endsWith('.md'))
		.sort(([left], [right]) => left.localeCompare(right))
		.map(([fileName, content]) => ({
			filePath: fileName,
			fileName,
			content,
			lineCount: content.split('\n').length
		}));
	return {
		campaignName: campaignNameFrom(vaultPath),
		vaultPath,
		notes,
		suggestions: [],
		approvedFacts: [],
		locations: []
	};
}

export function ensureMockPath(vaultPath: string) {
	ensureDir(vaultPath);
	persist();
}

export function createMockCampaign(vaultPath: string): CampaignOverview {
	const normalized = normalizePath(vaultPath);
	const node = ensureDir(normalized);
	if (!node.files['session-0.md']) {
		node.files['session-0.md'] = STARTER_NOTE;
	}
	const overview = overviewFromNode(normalized, node);
	mockCampaigns.set(normalized, overview);
	persist();
	return JSON.parse(JSON.stringify(overview)) as CampaignOverview;
}

export function openMockCampaign(vaultPath: string): CampaignOverview {
	const normalized = normalizePath(vaultPath);
	const node = getNode(normalized);
	if (!node) {
		throw new Error(`Campaign vault '${normalized}' does not exist.`);
	}
	const stored = mockCampaigns.get(normalized);
	if (stored) {
		return JSON.parse(JSON.stringify(stored)) as CampaignOverview;
	}
	const overview = overviewFromNode(normalized, node);
	mockCampaigns.set(normalized, overview);
	persist();
	return JSON.parse(JSON.stringify(overview)) as CampaignOverview;
}

export function storeMockCampaign(overview: CampaignOverview) {
	mockCampaigns.set(normalizePath(overview.vaultPath), JSON.parse(JSON.stringify(overview)) as CampaignOverview);
	persist();
}
