<script lang="ts">
	import favicon from "$lib/assets/favicon.svg";
	import "../app.css";
	import { onMount } from "svelte";
	import { initializeCampaign } from "$lib/stores/campaign";

	onMount(() => {
		void initializeCampaign();
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>Campaign Brain Co Pilot</title>
</svelte:head>

<slot />
