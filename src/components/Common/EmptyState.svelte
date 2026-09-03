<script lang="ts">
	export let title = '';
	export let description = '';
</script>

<section class="empty-state">
	<h2>{title}</h2>
	<p>{description}</p>
</section>

<style>
	.empty-state {
		padding: 1.5rem;
		text-align: center;
		border-radius: 1rem;
		background: rgba(15, 23, 42, 0.65);
		border: 1px dashed rgba(148, 163, 184, 0.35);
	}

	h2,
	p {
		margin: 0;
	}

	p {
		margin-top: 0.5rem;
		color: #94a3b8;
	}
</style>
