<script lang="ts">
	import SourceReferenceList from '../Common/SourceReferenceList.svelte';
	import type { Suggestion } from '$lib/types/campaign';

	export let suggestions: Suggestion[] = [];
	export let onApprove: (suggestion: Suggestion) => Promise<void>;
	export let onReject: (suggestionId: string) => void;
</script>

<div class="queue">
	{#each suggestions as suggestion}
		<article>
			<div class="meta">
				<span>{suggestion.kind.replace('_', ' ')}</span>
				<h3>{suggestion.value}</h3>
			</div>
			<p>{suggestion.context}</p>
			<SourceReferenceList sources={[suggestion.source]} />
			<footer>
				<button class="secondary" on:click={() => onReject(suggestion.id)}>Reject</button>
				<button on:click={() => onApprove(suggestion)}>Approve</button>
			</footer>
		</article>
	{/each}
</div>

<style>
	.queue {
		display: grid;
		gap: 1rem;
	}

	article {
		padding: 1rem;
		border-radius: 1rem;
		background: rgba(15, 23, 42, 0.72);
		border: 1px solid rgba(148, 163, 184, 0.18);
		display: grid;
		gap: 0.9rem;
	}

	.meta {
		display: grid;
		gap: 0.2rem;
	}

	span {
		text-transform: uppercase;
		letter-spacing: 0.08em;
		font-size: 0.78rem;
		color: #93c5fd;
	}

	h3,
	p {
		margin: 0;
	}

	footer {
		display: flex;
		justify-content: flex-end;
		gap: 0.75rem;
	}

	button {
		padding: 0.7rem 1rem;
		border: none;
		border-radius: 0.85rem;
		background: #2563eb;
		color: white;
	}

	button.secondary {
		background: rgba(51, 65, 85, 0.9);
	}
</style>
