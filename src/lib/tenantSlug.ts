export function validateTenantSlug(slug: string): { ok: boolean; error?: string } {
	if (!slug) {
		return { ok: false, error: 'Slug is required' };
	}

	if (slug.length < 3) {
		return { ok: false, error: 'Slug must be at least 3 characters' };
	}

	if (slug.length > 63) {
		return { ok: false, error: 'Slug must be at most 63 characters' };
	}

	if (slug.startsWith('-')) {
		return { ok: false, error: 'Slug cannot start with a hyphen' };
	}

	if (slug.endsWith('-')) {
		return { ok: false, error: 'Slug cannot end with a hyphen' };
	}

	const validPattern = /^[a-z0-9-]+$/;
	if (!validPattern.test(slug)) {
		return { ok: false, error: 'Slug can only contain lowercase letters, digits, and hyphens' };
	}

	return { ok: true };
}
