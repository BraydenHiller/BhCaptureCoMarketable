export async function signInTenant(username: string, password: string): Promise<{ cognitoSub: string }> {
	void username;
	void password;
	throw new Error("Tenant auth not implemented yet");
}
