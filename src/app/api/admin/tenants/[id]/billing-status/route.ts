import { NextRequest, NextResponse } from 'next/server';
import { requireMasterAdminSession } from '@/lib/auth/requireMasterAdminSession';
import { prisma } from '@/db/prisma';

const VALID_BILLING_STATUSES = ['PENDING', 'ACTIVE', 'PAST_DUE', 'CANCELED'] as const;

export async function PATCH(
	request: NextRequest,
	{ params }: { params: { id: string } }
) {
	await requireMasterAdminSession();

	const body = await request.json();
	const billingStatus = body.billingStatus;

	if (!VALID_BILLING_STATUSES.includes(billingStatus)) {
		return NextResponse.json(
			{ ok: false, error: 'Invalid billing status' },
			{ status: 400 }
		);
	}

	try {
		await prisma.tenant.update({
			where: { id: params.id },
			data: { billingStatus },
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
