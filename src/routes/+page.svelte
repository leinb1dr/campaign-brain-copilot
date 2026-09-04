<script lang="ts">
	import { goto } from '$app/navigation';
	import FolderPicker from '../components/Vault/FolderPicker.svelte';
	import {
		browseDirectory,
		createCampaignVault,
		createVaultFolder,
		knownVaults,
		openCampaignVault,
		openExampleVault
	} from '$lib/stores/campaign';
	import type { DirectoryListing } from '$lib/types/campaign';

	let error = '';
	let loading = false;
	let pickerMode: 'open' | 'create' | null = null;
	let listing: DirectoryListing | null = null;
	let pickerError = '';
	let pickerLoading = false;

	async function openLoadedVault() {
		await goto('/campaign');
	}

	async function handleOpen(path: string) {
		loading = true;
		error = '';
		try {
			await openCampaignVault(path);
			await openLoadedVault();
		} catch (reason) {
			error = reason instanceof Error ? reason.message : 'Unable to open the campaign vault.';
		} finally {
			loading = false;
		}
	}

	async function handleCreate(path: string) {
		loading = true;
		error = '';
		try {
			await createCampaignVault(path);
			await openLoadedVault();
		} catch (reason) {
			error = reason instanceof Error ? reason.message : 'Unable to create the campaign vault.';
		} finally {
			loading = false;
		}
	}

	async function handleExample() {
		loading = true;
		error = '';
		try {
			await openExampleVault();
			await openLoadedVault();
		} catch (reason) {
			error = reason instanceof Error ? reason.message : 'Unable to open the campaign vault.';
		} finally {
			loading = false;
		}
	}

	async function showPicker(mode: 'open' | 'create') {
		pickerLoading = true;
		pickerError = '';
		error = '';
		pickerMode = mode;
		try {
			listing = await browseDirectory();
		} catch (reason) {
			pickerMode = null;
			listing = null;
			error = reason instanceof Error ? reason.message : 'Unable to open the folder picker.';
		} finally {
			pickerLoading = false;
		}
	}

	async function openDirectory(path: string) {
		pickerLoading = true;
		pickerError = '';
		try {
			listing = await browseDirectory(path);
		} catch (reason) {
			pickerError = reason instanceof Error ? reason.message : 'Unable to open that folder.';
		} finally {
			pickerLoading = false;
		}
	}

	async function createDirectory(name: string) {
		if (!listing) {
			return;
		}
		pickerLoading = true;
		pickerError = '';
		try {
			listing = await createVaultFolder(listing.path, name);
		} catch (reason) {
			pickerError = reason instanceof Error ? reason.message : 'Unable to create that folder.';
		} finally {
			pickerLoading = false;
		}
	}

	function closePicker() {
		pickerMode = null;
		listing = null;
		pickerError = '';
	}

	async function confirmPicker(path: string) {
		const mode = pickerMode;
		closePicker();
		if (mode === 'create') {
			await handleCreate(path);
		} else {
			await handleOpen(path);
		}
	}
</script>

<svelte:head>
	<title>Open Campaign | Campaign Brain Co Pilot</title>
</svelte:head>

<section class="hero">
	<div class="copy">
		<p class="eyebrow">Campaign Brain Co Pilot</p>
		<h1>Turn messy session notes into reviewable campaign canon.</h1>
		<p>
			Keep markdown notes as the source of truth, extract structured suggestions with source references,
			and approve only the facts that should become canon.
		</p>
	</div>

	<div class="panel">
		{#if $knownVaults.length}
			<section class="known">
				<h2>Existing vaults</h2>
				<ul>
					{#each $knownVaults as vault (vault.path)}
						<li>
							<button type="button" class="vault" disabled={loading} on:click={() => handleOpen(vault.path)}>
								<span class="name">{vault.name}</span>
								<span class="path">{vault.path}</span>
							</button>
						</li>
					{/each}
				</ul>
			</section>
		{:else}
			<p class="hint">Create a vault folder to get started, or browse for notes you already keep.</p>
		{/if}

		<div class="actions">
			<button type="button" disabled={loading} on:click={() => showPicker('open')}>Browse for a vault</button>
			<button type="button" class="secondary" disabled={loading} on:click={() => showPicker('create')}
				>Create vault</button
			>
		</div>
		<button type="button" class="ghost" disabled={loading} on:click={handleExample}>Open example campaign</button>
		{#if error}
			<p class="error">{error}</p>
		{/if}
	</div>
</section>

{#if pickerMode && listing}
	<FolderPicker
		title={pickerMode === 'create' ? 'Create a campaign vault' : 'Open a campaign vault'}
		description={pickerMode === 'create'
			? 'Create a folder for your notes, then use it as the new vault.'
			: 'Choose the folder that already holds your campaign notes.'}
		confirmLabel={pickerMode === 'create' ? 'Use this folder' : 'Open this folder'}
		{listing}
		loading={pickerLoading}
		error={pickerError}
		onOpenDirectory={openDirectory}
		onCreateDirectory={createDirectory}
		onConfirm={confirmPicker}
		onCancel={closePicker}
	/>
{/if}

<style>
	.hero {
		max-width: 1100px;
		margin: 0 auto;
		padding: 5rem 1.5rem;
		display: grid;
		gap: 2rem;
		grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
		align-items: center;
	}

	.copy,
	.panel {
		padding: 1.5rem;
		border-radius: 1.25rem;
		background: rgba(15, 23, 42, 0.7);
		border: 1px solid rgba(148, 163, 184, 0.18);
	}

	.eyebrow {
		text-transform: uppercase;
		letter-spacing: 0.12em;
		color: #93c5fd;
		font-size: 0.78rem;
	}

	h1 {
		font-size: clamp(2.5rem, 5vw, 4rem);
		line-height: 1.05;
		margin: 0.4rem 0 1rem;
	}

	h2 {
		margin: 0;
		font-size: 1.05rem;
	}

	p {
		margin: 0;
		color: #cbd5e1;
	}

	.panel {
		display: grid;
		gap: 1rem;
	}

	.known ul {
		list-style: none;
		margin: 0.75rem 0 0;
		padding: 0;
		display: grid;
		gap: 0.5rem;
	}

	.vault {
		width: 100%;
		display: grid;
		gap: 0.2rem;
		text-align: left;
		padding: 0.85rem 1rem;
		border-radius: 0.9rem;
		border: 1px solid rgba(148, 163, 184, 0.22);
		background: rgba(15, 23, 42, 0.95);
		color: inherit;
	}

	.vault .path,
	.hint {
		color: #94a3b8;
		font-size: 0.9rem;
	}

	.actions {
		display: flex;
		gap: 0.75rem;
		flex-wrap: wrap;
	}

	button {
		padding: 0.85rem 1rem;
		border-radius: 0.9rem;
		border: none;
		background: #2563eb;
		color: white;
	}

	.secondary {
		background: #0f766e;
	}

	.ghost {
		background: rgba(51, 65, 85, 0.9);
	}

	.error {
		color: #fca5a5;
	}
</style>
