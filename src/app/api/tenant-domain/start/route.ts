import { NextRequest, NextResponse } from 'next/server';
import { requireMainDomain } from '@/lib/http/requireMainDomain';
import { requireTenantSession } from '@/lib/auth/requireTenantSession';
import { runWithTenantScope } from '@/lib/requestScope';
import { createOrResetTenantDomain } from '@/db/tenantDomain';
import { TenantDomainStatus } from '@prisma/client';
import { env } from '@/lib/env';
import { randomBytes, randomUUID } from 'node:crypto';

function normalizeHostname(raw: string): string {
	let value = raw.trim().toLowerCase();
	value = value.replace(/^https?:\/\//, '');
	const slashIndex = value.indexOf('/');
	if (slashIndex !== -1) {
		value = value.slice(0, slashIndex);
	}
	value = value.replace(/\/+$/, '');

	if (value.startsWith('[')) {
		const end = value.indexOf(']');
		if (end !== -1) {
			value = value.slice(1, end);
		}
	} else {
		value = value.split(':')[0];
	}

	return value.trim().toLowerCase();
}

function isIpv4(hostname: string): boolean {
	return /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname);
}

function generateVerificationToken(): string {
	try {
		if (typeof randomUUID === 'function') {
			return randomUUID();
		}
	} catch {
		// fall back to random bytes
	}
	return randomBytes(16).toString('hex');
}

export async function POST(request: NextRequest) {
	await requireMainDomain();
	const session = await requireTenantSession();
	const contentType = request.headers.get('content-type') ?? '';
	const isJson = contentType.includes('application/json');

	try {
		let rawHostname = '';
		if (isJson) {
			const body = (await request.json()) as { hostname?: string };
			rawHostname = body.hostname ?? '';
		} else {
			const formData = await request.formData();
			const formValue = formData.get('hostname');
			rawHostname = typeof formValue === 'string' ? formValue : '';
		}
		if (!rawHostname || typeof rawHostname !== 'string') {
			return NextResponse.json({ error: 'HOSTNAME_REQUIRED' }, { status: 400 });
		}

		const hostname = normalizeHostname(rawHostname);
		if (!hostname) {
			return NextResponse.json({ error: 'HOSTNAME_REQUIRED' }, { status: 400 });
		}

		if (/\s/.test(hostname)) {
			return NextResponse.json({ error: 'HOSTNAME_INVALID' }, { status: 400 });
		}

		if (hostname === 'localhost') {
			return NextResponse.json({ error: 'HOSTNAME_INVALID' }, { status: 400 });
		}

		if (isIpv4(hostname)) {
			return NextResponse.json({ error: 'HOSTNAME_INVALID' }, { status: 400 });
		}

		const mainDomain = normalizeHostname(env.NEXT_PUBLIC_MAIN_DOMAIN);
		if (mainDomain && hostname === mainDomain) {
			return NextResponse.json({ error: 'HOSTNAME_INVALID' }, { status: 400 });
		}

		const verificationToken = generateVerificationToken();
		const txtRecordName = `_bhc_verify.${hostname}`;
		const txtRecordValue = verificationToken;

		const record = await runWithTenantScope(session.tenantId, async () =>
			createOrResetTenantDomain({
				hostname,
				verificationToken,
				txtRecordName,
				txtRecordValue,
			})
		);

		if (!isJson) {
			return NextResponse.redirect(new URL('/app', request.url));
		}

		return NextResponse.json({
			hostname: record.hostname,
			status: record.status as TenantDomainStatus,
			txtRecordName: record.txtRecordName,
			txtRecordValue: record.txtRecordValue,
		});
	} catch {
		return NextResponse.json({ error: 'INTERNAL_SERVER_ERROR' }, { status: 500 });
	}
}
