<script lang="ts">
	export let currentPath = '';

	const links = [
		{ href: '/campaign', label: 'Dashboard' },
		{ href: '/campaign/notes', label: 'Imported Notes' },
		{ href: '/campaign/suggestions', label: 'Suggestions Review' }
	];
</script>

<nav class="nav">
	{#each links as link}
		<a class:active={currentPath === link.href} href={link.href}>{link.label}</a>
	{/each}
</nav>

<style>
	.nav {
		display: flex;
		gap: 0.75rem;
		flex-wrap: wrap;
	}

	a {
		padding: 0.65rem 1rem;
		border-radius: 999px;
		background: rgba(15, 23, 42, 0.65);
		border: 1px solid rgba(148, 163, 184, 0.2);
		color: #cbd5e1;
	}

	.active {
		background: rgba(59, 130, 246, 0.2);
		color: #eff6ff;
		border-color: rgba(96, 165, 250, 0.55);
	}
</style>
