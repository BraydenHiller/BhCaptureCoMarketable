import { NextRequest, NextResponse } from 'next/server';
import { requireMasterAdminSession } from '@/lib/auth/requireMasterAdminSession';
import { prisma } from '@/db/prisma';

const VALID_STATUSES = ['ACTIVE', 'SUSPENDED', 'DELETED'] as const;

export async function PATCH(
	request: NextRequest,
	{ params }: { params: { id: string } }
) {
	await requireMasterAdminSession();

	const body = await request.json();
	const status = body.status;

	if (!VALID_STATUSES.includes(status)) {
		return NextResponse.json(
			{ ok: false, error: 'Invalid status' },
			{ status: 400 }
		);
	}

	try {
		await prisma.tenant.update({
			where: { id: params.id },
			data: { status },
		});

		return NextResponse.json({ ok: true });
	} catch (err) {
		if (err && typeof err === 'object' && 'code' in err && err.code === 'P2025') {
			return NextResponse.json(
				{ ok: false, error: 'Tenant not found' },
				{ status: 404 }
			);
		}

		throw err;
	}
}
