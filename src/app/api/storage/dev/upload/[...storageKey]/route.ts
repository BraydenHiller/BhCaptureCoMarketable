import { NextRequest, NextResponse } from 'next/server';

export async function PUT(
	request: NextRequest,
	{ params }: { params: Promise<{ storageKey: string[] }> }
) {
	const { storageKey } = await params;

	// Reconstruct the storage key path
	const storageKeyJoined = storageKey.join('/');

	// Get the signature from query params
	const sig = request.nextUrl.searchParams.get('sig');

	// Compute expected signature
	const expectedSignature = btoa(storageKeyJoined).slice(0, 16);

	// Validate signature
	if (!sig || sig !== expectedSignature) {
		return NextResponse.json(
			{ error: 'INVALID_SIGNATURE' },
			{ status: 403 }
		);
	}

	// Read body as ArrayBuffer
	const buffer = await request.arrayBuffer();
	const bytes = buffer.byteLength;

	// Return success response
	return NextResponse.json(
		{ ok: true, bytes },
		{ status: 200 }
	);
}
