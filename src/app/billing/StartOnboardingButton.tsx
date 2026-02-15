'use client';

import { useTransition } from 'react';
import type { FormEvent } from 'react';

export default function StartOnboardingButton() {
	const [isPending, startTransition] = useTransition();

	const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		startTransition(() => {
			void (async () => {
				const response = await fetch('/api/stripe/connect/onboard', { method: 'POST' });
				if (!response.ok) {
					const text = await response.text();
					throw new Error(`onboard failed: ${response.status} ${text.slice(0, 200)}`);
				}
				const data = (await response.json()) as { url: string };
				window.location.assign(data.url);
			})();
		});
	};

	return (
		<form onSubmit={handleSubmit}>
			<button
				type="submit"
				disabled={isPending}
				className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
			>
				Start Stripe Onboarding
			</button>
		</form>
	);
}
