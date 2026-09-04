import { svelteTesting } from '@testing-library/svelte/vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
	plugins: [svelte({ compilerOptions: { hmr: false } }), svelteTesting()],
	resolve: {
		alias: {
			$lib: path.join(root, 'src/lib'),
			'$app/environment': path.join(root, 'src/test/mocks/app-environment.ts')
		}
	},
	test: {
		environment: 'jsdom',
		include: ['src/**/*.{test,spec}.{js,ts}'],
		setupFiles: ['src/test/setup.ts']
	}
});
