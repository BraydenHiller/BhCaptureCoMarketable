import Link from "next/link";

export default function Page() {
	return (
		<div className="min-h-screen flex items-center justify-center bg-gray-50">
			<div className="max-w-md w-full space-y-4 text-center">
				<h1 className="text-3xl font-bold text-gray-900">Billing Required</h1>
				<p className="text-gray-600">
					Complete payment to activate your tenant account.
				</p>
				<Link href="/login" className="text-indigo-600 hover:text-indigo-500">
					Back to sign in
				</Link>
			</div>
		</div>
	);
}
