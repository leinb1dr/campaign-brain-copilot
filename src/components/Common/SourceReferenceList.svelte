<script lang="ts">
	import type { SourceReference } from '$lib/types/campaign';

	export let sources: SourceReference[] = [];
</script>

<ul class="sources">
	{#each sources as source}
		<li>
			<strong>{source.filePath}:{source.lineNumber}</strong>
			<p>{source.snippet}</p>
		</li>
	{/each}
</ul>

<style>
	.sources {
		list-style: none;
		padding: 0;
		margin: 0;
		display: grid;
		gap: 0.75rem;
	}

	li {
		padding: 0.9rem 1rem;
		border-radius: 0.9rem;
		background: rgba(15, 23, 42, 0.55);
		border: 1px solid rgba(148, 163, 184, 0.18);
	}

	p {
		margin: 0.25rem 0 0;
		color: #cbd5e1;
	}
</style>
