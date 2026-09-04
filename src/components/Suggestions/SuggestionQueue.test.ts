import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { Suggestion } from '$lib/types/campaign';
import SuggestionQueue from './SuggestionQueue.svelte';

const suggestions: Suggestion[] = [
	{
		id: 'Location:session-1.md:2:blackglass wharf',
		kind: 'location',
		value: 'Blackglass Wharf',
		context: '- Met Captain Mirel at Blackglass Wharf after the rain quit.',
		source: {
			filePath: 'session-1.md',
			lineNumber: 2,
			snippet: '- Met Captain Mirel at Blackglass Wharf after the rain quit.'
		}
	},
	{
		id: 'Npc:session-1.md:2:captain mirel',
		kind: 'npc',
		value: 'Captain Mirel',
		context: '- Met Captain Mirel at Blackglass Wharf after the rain quit.',
		source: {
			filePath: 'session-1.md',
			lineNumber: 2,
			snippet: '- Met Captain Mirel at Blackglass Wharf after the rain quit.'
		}
	}
];

describe('SuggestionQueue', () => {
	it('renders suggestion values and source references', () => {
		render(SuggestionQueue, {
			props: {
				suggestions,
				onApprove: vi.fn(),
				onReject: vi.fn()
			}
		});

		expect(screen.getByRole('heading', { name: 'Blackglass Wharf' })).toBeInTheDocument();
		expect(screen.getByRole('heading', { name: 'Captain Mirel' })).toBeInTheDocument();
		expect(screen.getAllByText('session-1.md:2')).toHaveLength(2);
	});

	it('approves and rejects the suggestion that was clicked', async () => {
		const user = userEvent.setup();
		const onApprove = vi.fn().mockResolvedValue(undefined);
		const onReject = vi.fn();

		render(SuggestionQueue, {
			props: {
				suggestions,
				onApprove,
				onReject
			}
		});

		const wharfCard = screen.getByRole('heading', { name: 'Blackglass Wharf' }).closest('article');
		expect(wharfCard).not.toBeNull();
		await user.click(wharfCard!.querySelector('button:last-of-type') as HTMLButtonElement);
		expect(onApprove).toHaveBeenCalledWith(suggestions[0]);

		const captainCard = screen.getByRole('heading', { name: 'Captain Mirel' }).closest('article');
		expect(captainCard).not.toBeNull();
		await user.click(captainCard!.querySelector('button.secondary') as HTMLButtonElement);
		expect(onReject).toHaveBeenCalledWith(suggestions[1].id);
	});
});
