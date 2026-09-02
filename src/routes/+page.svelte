<script lang="ts">
	import { goto } from '$app/navigation';
	import { createCampaignVault, openCampaignVault, openExampleVault } from '$lib/stores/campaign';

	let vaultPath = '';
	let error = '';
	let loading = false;

	async function handle(action: 'open' | 'create' | 'example') {
		loading = true;
		error = '';
		try {
			if (action === 'example') {
				await openExampleVault();
			} else if (action === 'create') {
				await createCampaignVault(vaultPath.trim());
			} else {
				await openCampaignVault(vaultPath.trim());
			}
			await goto('/campaign');
		} catch (reason) {
			error = reason instanceof Error ? reason.message : 'Unable to open the campaign vault.';
		} finally {
			loading = false;
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

	<form class="panel" on:submit|preventDefault={() => handle('open')}>
		<label for="vaultPath">Campaign vault path</label>
		<input id="vaultPath" bind:value={vaultPath} placeholder="/path/to/campaign-vault" />
		<div class="actions">
			<button type="submit" disabled={loading || !vaultPath.trim()}>Open vault</button>
			<button type="button" class="secondary" disabled={loading || !vaultPath.trim()} on:click={() => handle('create')}
				>Create vault</button
			>
		</div>
		<button type="button" class="ghost" disabled={loading} on:click={() => handle('example')}
			>Open example campaign</button
		>
		{#if error}
			<p class="error">{error}</p>
		{/if}
	</form>
</section>

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

	p {
		margin: 0;
		color: #cbd5e1;
	}

	form {
		display: grid;
		gap: 1rem;
	}

	label {
		font-weight: 600;
	}

	input {
		padding: 0.85rem 1rem;
		border-radius: 0.9rem;
		border: 1px solid rgba(148, 163, 184, 0.25);
		background: rgba(15, 23, 42, 0.95);
		color: inherit;
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
