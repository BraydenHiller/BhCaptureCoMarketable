import { describe, it, expect } from 'vitest';
import { getRequestBaseUrl } from './baseUrl';

describe('getRequestBaseUrl', () => {
	it('returns origin from request.url when no forwarded headers', () => {
		const request = new Request('https://a.com/path');
		const result = getRequestBaseUrl(request);
		expect(result).toBe('https://a.com');
	});

	it('returns forwarded proto and host when headers present', () => {
		const request = new Request('https://original.com/path', {
			headers: {
				'x-forwarded-proto': 'https',
				'x-forwarded-host': 'b.com',
			},
		});
		const result = getRequestBaseUrl(request);
		expect(result).toBe('https://b.com');
	});
});
