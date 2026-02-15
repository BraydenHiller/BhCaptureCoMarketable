import "server-only";
import Link from 'next/link';

export default function Page() {
	return (
		<div className="space-y-4">
			<h1 className="text-2xl font-bold">Welcome to BhCaptureCo</h1>
			<p className="text-gray-600">Platform home page</p>
			<div className="flex flex-wrap gap-3">
				<Link href="/login" className="inline-block bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
					Sign in
				</Link>
				<Link href="/signup" className="inline-block bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
					Create account
				</Link>
			</div>
		</div>
	);
}
