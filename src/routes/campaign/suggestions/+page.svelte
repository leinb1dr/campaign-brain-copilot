<script lang="ts">
	import EmptyState from '../../../components/Common/EmptyState.svelte';
	import SuggestionQueue from '../../../components/Suggestions/SuggestionQueue.svelte';
	import { approveCampaignSuggestion, campaign, rejectCampaignSuggestion, visibleSuggestions } from '$lib/stores/campaign';
	import type { Suggestion } from '$lib/types/campaign';

	let busySuggestionId = '';
	let error = '';

	async function handleApprove(suggestion: Suggestion) {
		busySuggestionId = suggestion.id;
		error = '';
		try {
			await approveCampaignSuggestion(suggestion);
		} catch (reason) {
			error = reason instanceof Error ? reason.message : 'Unable to approve this suggestion.';
		} finally {
			busySuggestionId = '';
		}
	}
</script>

<svelte:head>
	<title>Suggestions Review | Campaign Brain Co Pilot</title>
</svelte:head>

{#if $campaign}
	<section class="panel">
		<div class="heading-row">
			<div>
				<p class="eyebrow">Suggestions Review</p>
				<h2>Approve or reject extracted facts</h2>
				<p>Nothing becomes canon until you approve it.</p>
			</div>
			<span>{busySuggestionId ? 'Saving approval…' : `${$visibleSuggestions.length} pending`}</span>
		</div>
		{#if error}
			<p class="error">{error}</p>
		{/if}
		{#if $visibleSuggestions.length}
			<SuggestionQueue suggestions={$visibleSuggestions} onApprove={handleApprove} onReject={rejectCampaignSuggestion} />
		{:else}
			<EmptyState
				title="Review queue is clear"
				description="Approve or reject extracted suggestions to keep your structured campaign state tidy."
			/>
		{/if}
	</section>
{/if}

<style>
	.panel {
		display: grid;
		gap: 1rem;
	}

	.heading-row {
		padding: 1.25rem;
		border-radius: 1rem;
		background: rgba(15, 23, 42, 0.72);
		border: 1px solid rgba(148, 163, 184, 0.18);
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		flex-wrap: wrap;
		align-items: end;
	}

	.eyebrow,
	span,
	.heading-row p:last-child {
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

	.error {
		margin: 0;
		color: #fca5a5;
	}
</style>
