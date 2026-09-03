import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	kit: {
		// Tauri loads the frontend from disk, so the whole app has to be static.
		// The fallback has to be named index.html: that is the last asset Tauri's
		// custom protocol tries before giving up on an unprerendered path.
		adapter: adapter({
			fallback: 'index.html'
		})
	}
};

export default config;
