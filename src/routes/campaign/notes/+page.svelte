<script lang="ts">
	import NotesList from '../../../components/Campaign/NotesList.svelte';
	import EmptyState from '../../../components/Common/EmptyState.svelte';
	import { campaign } from '$lib/stores/campaign';
</script>

<svelte:head>
	<title>Imported Notes | Campaign Brain Co Pilot</title>
</svelte:head>

{#if $campaign}
	<section class="panel">
		<div class="heading">
			<p class="eyebrow">Imported Notes</p>
			<h2>Raw campaign notes</h2>
			<p>These markdown files stay on disk as the source of truth for the campaign.</p>
		</div>
		{#if $campaign.notes.length}
			<NotesList notes={$campaign.notes} />
		{:else}
			<EmptyState
				title="No markdown notes found"
				description="Add a few .md files to the vault to generate dashboard context and suggestion review items."
			/>
		{/if}
	</section>
{/if}

<style>
	.panel {
		display: grid;
		gap: 1rem;
	}

	.heading {
		padding: 1.25rem;
		border-radius: 1rem;
		background: rgba(15, 23, 42, 0.72);
		border: 1px solid rgba(148, 163, 184, 0.18);
	}

	.eyebrow,
	.heading p:last-child {
		margin: 0;
		color: #94a3b8;
	}

	.eyebrow {
		text-transform: uppercase;
		letter-spacing: 0.12em;
		font-size: 0.78rem;
		color: #93c5fd;
	}

	h2 {
		margin: 0.25rem 0;
	}
</style>
