import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSession } from './src/lib/auth/session';

export async function middleware(request: NextRequest) {
	const { pathname } = request.nextUrl;

	// Allow public routes
	if (pathname === '/' || pathname === '/login' || pathname.startsWith('/api/auth/')) {
		return NextResponse.next();
	}

	// Get session
	const session = await getSession();

	// Protect /admin routes
	if (pathname.startsWith('/admin')) {
		if (!session || session.role !== 'MASTER_ADMIN') {
			return NextResponse.redirect(new URL('/login', request.url));
		}
		return NextResponse.next();
	}

	// Protect /app routes
	if (pathname.startsWith('/app')) {
		if (!session || session.role !== 'TENANT') {
			return NextResponse.redirect(new URL('/login', request.url));
		}
		return NextResponse.next();
	}

	return NextResponse.next();
}

export const config = {
	matcher: [
		'/((?!_next/static|_next/image|favicon.ico).*)',
	],
};
