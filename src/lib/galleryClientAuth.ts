import bcryptjs from 'bcryptjs';

type ClientGallerySession = {
	tenantId: string;
	galleryId: string;
} | null | undefined;

export function isClientSessionValid(
	session: ClientGallerySession,
	tenantId: string,
	galleryId: string
): boolean {
	return !!session && session.tenantId === tenantId && session.galleryId === galleryId;
}

export async function verifyClientPassword(input: string, storedHash: string | null | undefined): Promise<boolean> {
	if (!storedHash) return false;
	return bcryptjs.compare(input, storedHash);
}

export function verifyClientUsername(input: string, storedUsername: string | null | undefined): boolean {
	if (!storedUsername) return false;
	return input === storedUsername;
}
