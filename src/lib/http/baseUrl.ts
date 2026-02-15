export function getRequestBaseUrl(request: Request): string {
	const forwardedProto = request.headers.get('x-forwarded-proto');
	const forwardedHost = request.headers.get('x-forwarded-host');

	if (forwardedProto && forwardedHost) {
		return `${forwardedProto}://${forwardedHost}`;
	}

	const url = new URL(request.url);
	return url.origin;
}
