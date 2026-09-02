<script lang="ts">
	import type { NoteDocument } from '$lib/types/campaign';

	export let notes: NoteDocument[] = [];
</script>

<div class="notes-grid">
	{#each notes as note}
		<article>
			<header>
				<div>
					<h3>{note.fileName}</h3>
					<p>{note.filePath}</p>
				</div>
				<span>{note.lineCount} lines</span>
			</header>
			<pre>{note.content}</pre>
		</article>
	{/each}
</div>

<style>
	.notes-grid {
		display: grid;
		gap: 1rem;
	}

	article {
		padding: 1rem;
		border-radius: 1rem;
		background: rgba(15, 23, 42, 0.72);
		border: 1px solid rgba(148, 163, 184, 0.18);
	}

	header {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		align-items: start;
		margin-bottom: 0.75rem;
	}

	h3,
	p,
	span {
		margin: 0;
	}

	p,
	span {
		color: #94a3b8;
	}

	pre {
		white-space: pre-wrap;
		margin: 0;
		font-family: inherit;
		color: #e2e8f0;
	}
</style>
