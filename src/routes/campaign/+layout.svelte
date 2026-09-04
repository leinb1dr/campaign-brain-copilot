<script lang="ts">
	import { page } from "$app/stores";
	import CampaignNav from "../../components/Campaign/CampaignNav.svelte";
	import EmptyState from "../../components/Common/EmptyState.svelte";
	import { campaign } from "$lib/stores/campaign";
</script>

{#if $campaign}
	<section class="shell">
		<header>
			<div>
				<p class="eyebrow">Campaign Vault</p>
				<h1>{$campaign.campaignName}</h1>
				<p>{$campaign.vaultPath}</p>
			</div>
			<div class="header-actions">
				<CampaignNav currentPath={$page.url.pathname} />
				<a class="change-vault" href="/">Change vault</a>
			</div>
		</header>
		<slot />
	</section>
{:else}
	<section class="shell">
		<EmptyState
			title="Open a campaign to continue"
			description="Return to the welcome screen and choose an existing vault or seed the example campaign."
		/>
		<a class="back-link" href="/">Back to welcome</a>
	</section>
{/if}

<style>
	.shell {
		max-width: 1100px;
		margin: 0 auto;
		padding: 2rem 1.5rem 3rem;
		display: grid;
		gap: 1.5rem;
	}

	header {
		display: grid;
		gap: 1rem;
	}

	.header-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
		align-items: center;
		justify-content: space-between;
	}

	.change-vault {
		padding: 0.65rem 1rem;
		border-radius: 999px;
		background: rgba(51, 65, 85, 0.9);
		border: 1px solid rgba(148, 163, 184, 0.2);
	}

	.eyebrow,
	header p {
		margin: 0;
		color: #94a3b8;
	}

	.eyebrow {
		text-transform: uppercase;
		letter-spacing: 0.12em;
		font-size: 0.78rem;
		color: #93c5fd;
	}

	h1 {
		margin: 0.25rem 0;
	}

	.back-link {
		padding: 0.8rem 1rem;
		border-radius: 0.9rem;
		background: rgba(51, 65, 85, 0.9);
		justify-self: start;
	}
</style>
