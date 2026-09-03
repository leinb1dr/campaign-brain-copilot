import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

// Set by `tauri dev`/`tauri android dev` so a device can reach the dev server.
const host = process.env.TAURI_DEV_HOST;

export default defineConfig({
	plugins: [sveltekit()],
	// Tauri prints its own diagnostics into the same terminal.
	clearScreen: false,
	server: {
		// Must stay in sync with `build.devUrl` in src-tauri/tauri.conf.json.
		port: 1420,
		strictPort: true,
		host: host || false,
		hmr: host
			? {
					protocol: 'ws',
					host,
					port: 1421
				}
			: undefined,
		watch: {
			ignored: ['**/src-tauri/**']
		}
	},
	envPrefix: ['VITE_', 'TAURI_ENV_*']
});
