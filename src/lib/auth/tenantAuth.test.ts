import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockSend = vi.fn();

vi.mock('@aws-sdk/client-cognito-identity-provider', () => ({
	CognitoIdentityProviderClient: class {
		send = mockSend;
	},
	InitiateAuthCommand: class {
		constructor(public input: Record<string, unknown>) {}
	},
	GetUserCommand: class {
		constructor(public input: Record<string, unknown>) {}
	},
}));

describe('tenantAuth', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		process.env.AWS_REGION = 'us-east-1';
		process.env.COGNITO_APP_CLIENT_ID = 'test-client-id';
		mockSend.mockClear();
	});

	afterEach(() => {
		vi.resetModules();
	});

	it('signInTenant throws on Cognito error', async () => {
		mockSend.mockRejectedValue(new Error('Cognito error'));

		const { signInTenant } = await import('./tenantAuth');
		await expect(signInTenant('user', 'pass')).rejects.toThrow();
	});
});
