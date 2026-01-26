import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@aws-sdk/client-cognito-identity-provider', () => ({
	CognitoIdentityProviderClient: vi.fn(),
	InitiateAuthCommand: vi.fn(),
	GetUserCommand: vi.fn(),
}));

describe('tenantAuth', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		process.env.AWS_REGION = 'us-east-1';
		process.env.COGNITO_APP_CLIENT_ID = 'test-client-id';
	});

	it('signInTenant throws Authentication failed on error', async () => {
		const { signInTenant } = await import('./tenantAuth');
		await expect(signInTenant('user', 'pass')).rejects.toThrow('Authentication failed');
	});
});
