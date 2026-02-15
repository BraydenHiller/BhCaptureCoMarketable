import { NextRequest, NextResponse } from 'next/server';
import { requireMasterAdminSession } from '@/lib/auth/requireMasterAdminSession';
import { prisma } from '@/db/prisma';
import { validateTenantSlug } from '@/lib/tenantSlug';

export async function PATCH(
	request: NextRequest,
	{ params }: { params: { id: string } }
) {
	await requireMasterAdminSession();

	const body = await request.json();
	const slug = body.slug;

	if (typeof slug !== 'string') {
		return NextResponse.json(
			{ ok: false, error: 'Invalid input' },
			{ status: 400 }
		);
	}

	const validation = validateTenantSlug(slug);
	if (!validation.ok) {
		return NextResponse.json(
			{ ok: false, error: validation.error },
			{ status: 400 }
		);
	}

	try {
		await prisma.tenant.update({
			where: { id: params.id },
			data: { slug },
		});

		return NextResponse.json({ ok: true });
	} catch (err) {
		if (err && typeof err === 'object' && 'code' in err && err.code === 'P2002') {
			return NextResponse.json(
				{ ok: false, error: 'SLUG_TAKEN' },
				{ status: 409 }
			);
		}

		if (err && typeof err === 'object' && 'code' in err && err.code === 'P2025') {
			return NextResponse.json(
				{ ok: false, error: 'Tenant not found' },
				{ status: 404 }
			);
		}

		throw err;
	}
}
