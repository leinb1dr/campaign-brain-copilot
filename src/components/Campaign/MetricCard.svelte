<script lang="ts">
	export let label = '';
	export let value: number | string = 0;
	export let detail = '';
</script>

<section class="metric-card">
	<p>{label}</p>
	<strong>{value}</strong>
	{#if detail}
		<span>{detail}</span>
	{/if}
</section>

<style>
	.metric-card {
		padding: 1rem;
		border-radius: 1rem;
		background: rgba(15, 23, 42, 0.75);
		border: 1px solid rgba(148, 163, 184, 0.18);
		display: grid;
		gap: 0.35rem;
	}

	p,
	span {
		margin: 0;
		color: #94a3b8;
	}

	strong {
		font-size: 1.9rem;
	}
</style>
