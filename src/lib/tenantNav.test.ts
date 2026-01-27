import { describe, it, expect } from 'vitest';
import { tenantNav } from './tenantNav';

describe('tenantNav', () => {
	it('exports stable navigation contract', () => {
		expect(tenantNav).toHaveLength(2);

		expect(tenantNav[0]).toEqual({
			key: 'dashboard',
			label: 'Dashboard',
			href: '/app',
		});

		expect(tenantNav[1]).toEqual({
			key: 'galleries',
			label: 'Galleries',
			href: '/galleries',
		});
	});

	it('all items have required fields', () => {
		tenantNav.forEach((item) => {
			expect(item).toHaveProperty('key');
			expect(item).toHaveProperty('label');
			expect(item).toHaveProperty('href');
			expect(typeof item.key).toBe('string');
			expect(typeof item.label).toBe('string');
			expect(typeof item.href).toBe('string');
			expect(item.key.length).toBeGreaterThan(0);
			expect(item.label.length).toBeGreaterThan(0);
			expect(item.href).toMatch(/^\//);
		});
	});

	it('all keys are unique', () => {
		const keys = tenantNav.map((item) => item.key);
		const uniqueKeys = new Set(keys);
		expect(uniqueKeys.size).toBe(keys.length);
	});
});
