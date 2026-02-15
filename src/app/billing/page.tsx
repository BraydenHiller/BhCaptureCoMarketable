import { redirect } from 'next/navigation';
import { cookies, headers } from 'next/headers';

export default function Page() {
	async function startOnboarding() {
		'use server';
		const h = await headers();
		const proto = h.get('x-forwarded-proto') ?? 'http';
		const host = h.get('x-forwarded-host') ?? h.get('host');
		const url = `${proto}://${host}/api/stripe/connect/onboard`;
		const response = await fetch(url, {
			method: 'POST',
			headers: { cookie: cookies().toString() },
		});

		if (!response.ok) {
			redirect('/billing');
		}
		const data = await response.json();
		redirect(data.url);
	}

	return (
		<div className="min-h-screen flex items-center justify-center bg-gray-50">
			<div className="max-w-md w-full space-y-4 text-center">
				<h1 className="text-3xl font-bold text-gray-900">Billing Required</h1>
				<p className="text-gray-600">
					Complete payment to activate your tenant account.
				</p>
				<form action={startOnboarding} method="post">
					<button
						type="submit"
						className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
					>
						Start Stripe Onboarding
					</button>
				</form>
			</div>
		</div>
	);
}
