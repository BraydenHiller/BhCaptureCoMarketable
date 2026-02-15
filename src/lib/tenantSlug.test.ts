import { describe, it, expect } from 'vitest';
import { validateTenantSlug } from './tenantSlug';

describe('validateTenantSlug', () => {
	it('accepts valid slug', () => {
		const result = validateTenantSlug('my-tenant-123');
		expect(result.ok).toBe(true);
		expect(result.error).toBeUndefined();
	});

	it('rejects uppercase letters', () => {
		const result = validateTenantSlug('My-Tenant');
		expect(result.ok).toBe(false);
		expect(result.error).toContain('lowercase');
	});

	it('rejects underscore', () => {
		const result = validateTenantSlug('my_tenant');
		expect(result.ok).toBe(false);
		expect(result.error).toContain('lowercase');
	});

	it('rejects slug that is too short', () => {
		const result = validateTenantSlug('ab');
		expect(result.ok).toBe(false);
		expect(result.error).toContain('at least 3');
	});

	it('rejects slug that is too long', () => {
		const result = validateTenantSlug('a'.repeat(64));
		expect(result.ok).toBe(false);
		expect(result.error).toContain('at most 63');
	});

	it('rejects slug starting with hyphen', () => {
		const result = validateTenantSlug('-tenant');
		expect(result.ok).toBe(false);
		expect(result.error).toContain('cannot start');
	});

	it('rejects slug ending with hyphen', () => {
		const result = validateTenantSlug('tenant-');
		expect(result.ok).toBe(false);
		expect(result.error).toContain('cannot end');
	});

	it('rejects empty slug', () => {
		const result = validateTenantSlug('');
		expect(result.ok).toBe(false);
		expect(result.error).toContain('required');
	});
});
