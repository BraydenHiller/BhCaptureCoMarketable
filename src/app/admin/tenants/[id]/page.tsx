import { requireMasterAdminSession } from '@/lib/auth/requireMasterAdminSession';
import { prisma } from '@/db/prisma';
import { notFound, redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { validateTenantSlug } from '@/lib/tenantSlug';
import { BillingStatus, TenantStatus } from '@prisma/client';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function Page({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	await requireMasterAdminSession();

	const { id } = await params;

	const tenant = await prisma.tenant.findUnique({
		where: { id },
		select: {
			id: true,
			slug: true,
			status: true,
			billingStatus: true,
			createdAt: true,
		},
	});

	if (!tenant) {
		notFound();
	}

	async function updateSlug(formData: FormData) {
		'use server';
		await requireMasterAdminSession();

		const slug = formData.get('slug') as string;

		const validation = validateTenantSlug(slug);
		if (!validation.ok) {
			throw new Error('INVALID_SLUG');
		}

		try {
			await prisma.tenant.update({
				where: { id },
				data: { slug },
			});
		} catch (err) {
			if (err && typeof err === 'object' && 'code' in err && err.code === 'P2002') {
				throw new Error('SLUG_TAKEN');
			}
			throw err;
		}

		revalidatePath(`/admin/tenants/${id}`);
		redirect(`/admin/tenants/${id}`);
	}

	async function updateBillingStatus(formData: FormData) {
		'use server';
		await requireMasterAdminSession();

		const raw = formData.get('billingStatus') as string;

		if (!Object.values(BillingStatus).includes(raw as BillingStatus)) {
			throw new Error('INVALID_BILLING_STATUS');
		}

		const billingStatus = raw as BillingStatus;

		await prisma.tenant.update({
			where: { id },
			data: { billingStatus },
		});

		revalidatePath(`/admin/tenants/${id}`);
		redirect(`/admin/tenants/${id}`);
	}

	async function activateTenant() {
		'use server';
		await requireMasterAdminSession();

		await prisma.tenant.update({
			where: { id },
			data: { status: TenantStatus.ACTIVE },
		});

		revalidatePath(`/admin/tenants/${id}`);
		redirect(`/admin/tenants/${id}`);
	}

	async function suspendTenant(formData: FormData) {
		'use server';
		await requireMasterAdminSession();

		const confirmSuspend = formData.get('confirmSuspend');
		if (!confirmSuspend) {
			throw new Error('CONFIRM_REQUIRED');
		}

		await prisma.tenant.update({
			where: { id },
			data: { status: TenantStatus.SUSPENDED },
		});

		revalidatePath(`/admin/tenants/${id}`);
		redirect(`/admin/tenants/${id}`);
	}

	async function deleteTenant(formData: FormData) {
		'use server';
		await requireMasterAdminSession();

		const confirmDelete = formData.get('confirmDelete');
		if (!confirmDelete) {
			throw new Error('CONFIRM_REQUIRED');
		}

		await prisma.tenant.update({
			where: { id },
			data: { status: TenantStatus.DELETED },
		});

		revalidatePath(`/admin/tenants/${id}`);
		redirect(`/admin/tenants/${id}`);
	}

	return (
		<div className="space-y-4">
			<Link href="/admin/tenants" className="text-blue-600 hover:underline">
				← Back to Tenants
			</Link>
			<h1 className="text-2xl font-bold">Tenant Detail</h1>
			<div className="border border-gray-300 p-4 space-y-2">
				<div>
					<strong>ID:</strong> {tenant.id}
				</div>
				<div>
					<strong>Slug:</strong> {tenant.slug}
				</div>
				<div>
					<strong>Status:</strong> {tenant.status}
				</div>
				<div>
					<strong>Billing Status:</strong> {tenant.billingStatus}
				</div>
				<div>
					<strong>Created At:</strong> {tenant.createdAt.toISOString()}
				</div>
			</div>

			<div className="border border-gray-300 p-4 space-y-4">
				<h2 className="text-xl font-bold">Update Slug</h2>
				<form action={updateSlug} className="space-y-2">
					<input
						type="text"
						name="slug"
						defaultValue={tenant.slug}
						className="border border-gray-300 px-2 py-1 rounded"
						required
					/>
					<button
						type="submit"
						className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
					>
						Update Slug
					</button>
				</form>
			</div>

			<div className="border border-gray-300 p-4 space-y-4">
				<h2 className="text-xl font-bold">Update Billing Status</h2>
				<form action={updateBillingStatus} className="space-y-2">
					<select
						name="billingStatus"
						defaultValue={tenant.billingStatus}
						className="border border-gray-300 px-2 py-1 rounded"
						required
					>
						<option value="PENDING">PENDING</option>
						<option value="ACTIVE">ACTIVE</option>
						<option value="PAST_DUE">PAST_DUE</option>
						<option value="CANCELED">CANCELED</option>
					</select>
					<button
						type="submit"
						className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
					>
						Update Billing Status
					</button>
				</form>
			</div>

			<div className="border border-gray-300 p-4 space-y-4">
				<h2 className="text-xl font-bold">Update Status</h2>
				
				<div className="space-y-4">
					<form action={activateTenant} className="space-y-2">
						<p className="text-sm text-gray-600">Set tenant status to ACTIVE</p>
						<button
							type="submit"
							className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
						>
							Activate Tenant
						</button>
					</form>

					<form action={suspendTenant} className="space-y-2 border-t pt-4">
						<p className="text-sm text-gray-600">Set tenant status to SUSPENDED</p>
						<label className="flex items-center gap-2">
							<input
								type="checkbox"
								name="confirmSuspend"
								value="true"
								className="w-4 h-4"
							/>
							<span className="text-sm">I confirm I want to suspend this tenant</span>
						</label>
						<button
							type="submit"
							className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600"
						>
							Suspend Tenant
						</button>
					</form>

					<form action={deleteTenant} className="space-y-2 border-t pt-4">
						<p className="text-sm text-gray-600">Set tenant status to DELETED</p>
						<label className="flex items-center gap-2">
							<input
								type="checkbox"
								name="confirmDelete"
								value="true"
								className="w-4 h-4"
							/>
							<span className="text-sm">I confirm I want to delete this tenant</span>
						</label>
						<button
							type="submit"
							className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
						>
							Delete Tenant
						</button>
					</form>
				</div>
			</div>
		</div>
	);
}
