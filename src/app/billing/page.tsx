import StartOnboardingButton from './StartOnboardingButton';

export default function Page() {
	return (
		<div className="min-h-screen flex items-center justify-center bg-gray-50">
			<div className="max-w-md w-full space-y-4 text-center">
				<h1 className="text-3xl font-bold text-gray-900">Billing Required</h1>
				<p className="text-gray-600">
					Complete payment to activate your tenant account.
				</p>
				<StartOnboardingButton />
			</div>
		</div>
	);
}
