import { CognitoIdentityProviderClient, InitiateAuthCommand, GetUserCommand } from "@aws-sdk/client-cognito-identity-provider";

const client = new CognitoIdentityProviderClient({ region: process.env.AWS_REGION });

export async function signInTenant(username: string, password: string): Promise<{ cognitoSub: string }> {
	try {
		const authResponse = await client.send(
			new InitiateAuthCommand({
				ClientId: process.env.COGNITO_APP_CLIENT_ID,
				AuthFlow: "USER_PASSWORD_AUTH",
				AuthParameters: {
					USERNAME: username,
					PASSWORD: password,
				},
			})
		);

		if (!authResponse.AuthenticationResult?.AccessToken) {
			throw new Error("No access token received");
		}

		const userResponse = await client.send(
			new GetUserCommand({
				AccessToken: authResponse.AuthenticationResult.AccessToken,
			})
		);

		const subAttribute = userResponse.UserAttributes?.find((attr) => attr.Name === "sub");
		if (!subAttribute?.Value) {
			throw new Error("No sub attribute found");
		}

		return { cognitoSub: subAttribute.Value };
	} catch {
		throw new Error("Authentication failed");
	}
}
