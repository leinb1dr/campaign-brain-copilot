<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import EmptyState from '../../../../components/Common/EmptyState.svelte';
	import SourceReferenceList from '../../../../components/Common/SourceReferenceList.svelte';
	import { fetchLocationBriefing } from '$lib/stores/campaign';
	import type { LocationBriefing } from '$lib/types/campaign';

	let briefing: LocationBriefing | null = null;
	let error = '';
	let loading = true;
	let locationId = "";

	$: locationId = $page.params.id ?? "";

	onMount(async () => {
		loading = true;
		error = '';
		try {
			briefing = await fetchLocationBriefing(locationId);
		} catch (reason) {
			error = reason instanceof Error ? reason.message : 'Unable to load the location briefing.';
		} finally {
			loading = false;
		}
	});
</script>

<svelte:head>
	<title>Location Briefing | Campaign Brain Co Pilot</title>
</svelte:head>

{#if loading}
	<section class="panel"><p>Loading location briefing…</p></section>
{:else if error}
	<EmptyState title="Location unavailable" description={error} />
{:else if briefing}
	<section class="panel">
		<div class="heading">
			<p class="eyebrow">Location Briefing</p>
			<h2>{briefing.name}</h2>
			<p>Approved location details are grounded in the raw note snippets below.</p>
		</div>
		<div class="content-grid">
			<section>
				<h3>Source references</h3>
				<SourceReferenceList sources={briefing.sources} />
			</section>
			<section>
				<h3>Related canon plot points</h3>
				{#if briefing.relatedPlotPoints.length}
					<ul>
						{#each briefing.relatedPlotPoints as plotPoint}
							<li>{plotPoint}</li>
						{/each}
					</ul>
				{:else}
					<p>No approved plot points reference this location yet.</p>
				{/if}
			</section>
		</div>
	</section>
{/if}

<style>
	.panel {
		padding: 1.25rem;
		border-radius: 1rem;
		background: rgba(15, 23, 42, 0.72);
		border: 1px solid rgba(148, 163, 184, 0.18);
		display: grid;
		gap: 1rem;
	}

	.heading p:last-child,
	.eyebrow,
	li,
	section p {
		margin: 0;
		color: #cbd5e1;
	}

	.eyebrow {
		text-transform: uppercase;
		letter-spacing: 0.12em;
		font-size: 0.78rem;
		color: #93c5fd;
	}

	h2,
	h3 {
		margin: 0.25rem 0;
	}

	.content-grid {
		display: grid;
		gap: 1rem;
		grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
	}

	ul {
		padding-left: 1.1rem;
		margin: 0;
		display: grid;
		gap: 0.65rem;
	}
</style>
