import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { DirectoryListing } from '$lib/types/campaign';
import FolderPicker from './FolderPicker.svelte';

const listing: DirectoryListing = {
	path: '/campaigns',
	parentPath: '/',
	entries: [
		{ name: 'harbor-notes', path: '/campaigns/harbor-notes', isVault: true },
		{ name: 'empty-folder', path: '/campaigns/empty-folder', isVault: false }
	]
};

function renderPicker(overrides: Partial<DirectoryListing> = {}) {
	const onOpenDirectory = vi.fn();
	const onCreateDirectory = vi.fn();
	const onConfirm = vi.fn();
	const onCancel = vi.fn();
	render(FolderPicker, {
		props: {
			title: 'Create a campaign vault',
			description: 'Create a folder for your notes, then use it as the new vault.',
			confirmLabel: 'Use this folder',
			listing: { ...listing, ...overrides },
			loading: false,
			error: '',
			onOpenDirectory,
			onCreateDirectory,
			onConfirm,
			onCancel
		}
	});
	return { onOpenDirectory, onCreateDirectory, onConfirm, onCancel };
}

describe('FolderPicker', () => {
	it('lists folders and marks existing vaults', () => {
		renderPicker();

		expect(screen.getByRole('dialog', { name: 'Create a campaign vault' })).toBeInTheDocument();
		expect(screen.getByText('/campaigns')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /harbor-notes/ })).toBeInTheDocument();
		expect(screen.getByText('Vault')).toBeInTheDocument();
	});

	it('opens a child folder, creates a folder, and confirms the current path', async () => {
		const user = userEvent.setup();
		const { onOpenDirectory, onCreateDirectory, onConfirm } = renderPicker();

		await user.click(screen.getByRole('button', { name: /harbor-notes/ }));
		expect(onOpenDirectory).toHaveBeenCalledWith('/campaigns/harbor-notes');

		await user.type(screen.getByLabelText('New folder name'), 'frostward');
		await user.click(screen.getByRole('button', { name: 'Create folder' }));
		expect(onCreateDirectory).toHaveBeenCalledWith('frostward');

		await user.click(screen.getByRole('button', { name: 'Use this folder' }));
		expect(onConfirm).toHaveBeenCalledWith('/campaigns');
	});

	it('goes up one folder and cancels', async () => {
		const user = userEvent.setup();
		const { onOpenDirectory, onCancel } = renderPicker();

		await user.click(screen.getByRole('button', { name: 'Up one folder' }));
		expect(onOpenDirectory).toHaveBeenCalledWith('/');

		await user.click(screen.getByRole('button', { name: 'Cancel' }));
		expect(onCancel).toHaveBeenCalledOnce();
	});
});
