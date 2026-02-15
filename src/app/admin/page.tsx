import Link from 'next/link';

export default function Page() {
	return (
		<div className="space-y-4">
			<h1 className="text-2xl font-bold">Admin OK</h1>
			<Link
				href="/admin/tenants"
				className="inline-block bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
			>
				View Tenants
			</Link>
			<form action="/api/auth/logout" method="POST">
				<button
					type="submit"
					className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
				>
					Logout
				</button>
			</form>
		</div>
	);
}
