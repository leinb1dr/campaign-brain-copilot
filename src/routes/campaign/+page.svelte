<script lang="ts">
	import MetricCard from '../../components/Campaign/MetricCard.svelte';
	import EmptyState from '../../components/Common/EmptyState.svelte';
	import { campaign, visibleSuggestions } from '$lib/stores/campaign';
</script>

<svelte:head>
	<title>Dashboard | Campaign Brain Co Pilot</title>
</svelte:head>

{#if $campaign}
	<section class="dashboard-grid">
		<MetricCard label="Imported notes" value={$campaign.notes.length} detail="Raw markdown remains untouched on disk" />
		<MetricCard label="Pending suggestions" value={$visibleSuggestions.length} detail="Approve ideas before they become canon" />
		<MetricCard label="Approved facts" value={$campaign.approvedFacts.length} detail="Stored in SQLite with source references" />
	</section>

	<section class="panel">
		<div class="heading-row">
			<div>
				<p class="eyebrow">Approved locations</p>
				<h2>Location briefing jump list</h2>
			</div>
			<a href="/campaign/suggestions">Review new suggestions</a>
		</div>
		{#if $campaign.locations.length}
			<ul class="location-list">
				{#each $campaign.locations as location}
					<li>
						<a href={`/campaign/location/${location.id}`}>{location.name}</a>
						<span>{location.sourceCount} source{location.sourceCount === 1 ? '' : 's'}</span>
					</li>
				{/each}
			</ul>
		{:else}
			<EmptyState
				title="No canon locations yet"
				description="Approve at least one location suggestion to unlock detailed location briefings."
			/>
		{/if}
	</section>
{/if}

<style>
	.dashboard-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 1rem;
	}

	.panel {
		padding: 1.25rem;
		border-radius: 1rem;
		background: rgba(15, 23, 42, 0.72);
		border: 1px solid rgba(148, 163, 184, 0.18);
		display: grid;
		gap: 1rem;
	}

	.heading-row {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		align-items: end;
		flex-wrap: wrap;
	}

	.eyebrow,
	span {
		color: #94a3b8;
	}

	.eyebrow {
		margin: 0;
		text-transform: uppercase;
		letter-spacing: 0.12em;
		font-size: 0.78rem;
		color: #93c5fd;
	}

	h2 {
		margin: 0.25rem 0 0;
	}

	a {
		color: #bfdbfe;
	}

	.location-list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: grid;
		gap: 0.75rem;
	}

	li {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		padding: 0.9rem 1rem;
		border-radius: 0.9rem;
		background: rgba(2, 6, 23, 0.5);
	}
</style>
