<script lang="ts">
	import { DIRECTORY_ROOTS_PATH } from '$lib/types/campaign';
	import type { DirectoryListing } from '$lib/types/campaign';

	export let title = 'Choose a folder';
	export let description = '';
	export let confirmLabel = 'Use this folder';
	export let listing: DirectoryListing;
	export let loading = false;
	export let error = '';
	export let onOpenDirectory: (path: string) => void;
	export let onCreateDirectory: (name: string) => void;
	export let onConfirm: (path: string) => void;
	export let onCancel: () => void;

	let folderName = '';
	let jumpPath = '';
	$: isRoots = listing.path === DIRECTORY_ROOTS_PATH;
	$: currentPathLabel = isRoots ? 'This computer' : listing.path;

	function createFolder() {
		const name = folderName.trim();
		if (!name || loading || isRoots) {
			return;
		}
		onCreateDirectory(name);
		folderName = '';
	}

	function jumpToPath() {
		const path = jumpPath.trim();
		if (!path || loading) {
			return;
		}
		onOpenDirectory(path);
	}
</script>

<div class="backdrop" role="presentation">
	<div class="picker" role="dialog" aria-modal="true" aria-labelledby="folder-picker-title">
		<header>
			<h2 id="folder-picker-title">{title}</h2>
			{#if description}
				<p>{description}</p>
			{/if}
		</header>

		<p class="current-path" aria-live="polite">
			<span>Current folder</span>
			<code>{currentPathLabel}</code>
		</p>

		<div class="toolbar">
			<button
				type="button"
				class="ghost"
				disabled={loading || listing.parentPath == null}
				on:click={() => listing.parentPath != null && onOpenDirectory(listing.parentPath)}
			>
				Up one folder
			</button>
		</div>

		<ul class="folders">
			{#if listing.entries.length === 0}
				<li class="empty">No folders here yet. Create one below and select it.</li>
			{:else}
				{#each listing.entries as entry (entry.path)}
					<li>
						<button type="button" class="folder" disabled={loading} on:click={() => onOpenDirectory(entry.path)}>
							<span class="name">{entry.name}</span>
							{#if entry.isVault}
								<span class="badge">Vault</span>
							{/if}
						</button>
					</li>
				{/each}
			{/if}
		</ul>

		<form class="create" on:submit|preventDefault={jumpToPath}>
			<label for="jumpPath">Go to folder</label>
			<div class="create-row">
				<input
					id="jumpPath"
					bind:value={jumpPath}
					placeholder="D:\campaigns or \\server\share\vault"
					disabled={loading}
					autocomplete="off"
				/>
				<button type="submit" class="ghost" disabled={loading || !jumpPath.trim()}>Open path</button>
			</div>
		</form>

		<form class="create" on:submit|preventDefault={createFolder}>
			<label for="newFolderName">New folder name</label>
			<div class="create-row">
				<input
					id="newFolderName"
					bind:value={folderName}
					placeholder="my-campaign"
					disabled={loading || isRoots}
					autocomplete="off"
				/>
				<button type="submit" class="secondary" disabled={loading || isRoots || !folderName.trim()}
					>Create folder</button
				>
			</div>
		</form>

		{#if error}
			<p class="error">{error}</p>
		{/if}

		<div class="actions">
			<button type="button" class="ghost" disabled={loading} on:click={onCancel}>Cancel</button>
			<button type="button" disabled={loading || isRoots} on:click={() => onConfirm(listing.path)}
				>{confirmLabel}</button
			>
		</div>
	</div>
</div>

<style>
	.backdrop {
		position: fixed;
		inset: 0;
		z-index: 20;
		display: grid;
		place-items: center;
		padding: 1.5rem;
		background: rgba(2, 6, 23, 0.72);
	}

	.picker {
		width: min(36rem, 100%);
		display: grid;
		gap: 1rem;
		padding: 1.5rem;
		border-radius: 1.25rem;
		background: rgba(15, 23, 42, 0.96);
		border: 1px solid rgba(148, 163, 184, 0.22);
	}

	header p,
	.current-path,
	.empty,
	.error {
		margin: 0;
		color: #cbd5e1;
	}

	h2 {
		margin: 0 0 0.35rem;
	}

	.current-path {
		display: grid;
		gap: 0.25rem;
		font-size: 0.9rem;
	}

	.current-path span {
		color: #93c5fd;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		font-size: 0.72rem;
	}

	code {
		overflow-wrap: anywhere;
		color: #e2e8f0;
	}

	.toolbar,
	.actions,
	.create-row {
		display: flex;
		gap: 0.75rem;
		flex-wrap: wrap;
	}

	.folders {
		list-style: none;
		margin: 0;
		padding: 0;
		max-height: 16rem;
		overflow: auto;
		display: grid;
		gap: 0.4rem;
	}

	.folder,
	.empty {
		width: 100%;
		text-align: left;
		padding: 0.75rem 0.9rem;
		border-radius: 0.8rem;
		border: 1px solid rgba(148, 163, 184, 0.2);
		background: rgba(15, 23, 42, 0.85);
		color: inherit;
	}

	.folder {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 0.75rem;
	}

	.badge {
		font-size: 0.72rem;
		padding: 0.15rem 0.5rem;
		border-radius: 999px;
		background: rgba(13, 148, 136, 0.25);
		color: #99f6e4;
	}

	.create {
		display: grid;
		gap: 0.4rem;
	}

	label {
		font-weight: 600;
	}

	input {
		flex: 1;
		min-width: 10rem;
		padding: 0.75rem 0.9rem;
		border-radius: 0.8rem;
		border: 1px solid rgba(148, 163, 184, 0.25);
		background: rgba(15, 23, 42, 0.95);
		color: inherit;
	}

	button {
		padding: 0.75rem 1rem;
		border-radius: 0.8rem;
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

	.actions {
		justify-content: flex-end;
	}

	.error {
		color: #fca5a5;
	}
</style>
