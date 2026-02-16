import bcryptjs from 'bcryptjs';

type GalleryAccessMode = 'PRIVATE' | 'PUBLIC';
const ACCESS_PUBLIC: GalleryAccessMode = 'PUBLIC';
const ACCESS_PRIVATE: GalleryAccessMode = 'PRIVATE';

type GalleryAccessInput = {
	accessMode: string;
	clientUsername?: string | null;
	clientPassword?: string | null;
	existingPasswordHash?: string | null;
	requirePassword: boolean;
};

export async function buildGalleryAccess(input: GalleryAccessInput): Promise<{
	accessMode: GalleryAccessMode;
	clientUsername: string | null;
	clientPasswordHash: string | null;
}> {
	const mode = input.accessMode?.toUpperCase();
	if (mode === ACCESS_PUBLIC) {
		return { accessMode: ACCESS_PUBLIC, clientUsername: null, clientPasswordHash: null };
	}

	if (mode !== ACCESS_PRIVATE) {
		throw new Error('INVALID_ACCESS_MODE');
	}

	const username = (input.clientUsername ?? '').trim();
	if (!username) {
		throw new Error('CLIENT_USERNAME_REQUIRED');
	}

	const password = (input.clientPassword ?? '').toString();
	if (password) {
		const clientPasswordHash = await bcryptjs.hash(password, 10);
		return { accessMode: ACCESS_PRIVATE, clientUsername: username, clientPasswordHash };
	}

	if (input.requirePassword) {
		throw new Error('CLIENT_PASSWORD_REQUIRED');
	}

	if (input.existingPasswordHash) {
		return {
			accessMode: ACCESS_PRIVATE,
			clientUsername: username,
			clientPasswordHash: input.existingPasswordHash,
		};
	}

	throw new Error('CLIENT_PASSWORD_REQUIRED');
}
