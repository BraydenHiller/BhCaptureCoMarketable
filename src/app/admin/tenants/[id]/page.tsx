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
			storageUsedBytes: true,
			storageLimitBytes: true,
			storageEnforced: true,
			createdAt: true,
		},
	});

	if (!tenant) {
		notFound();
	}

	const path = `/admin/tenants/${id}`;

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

		revalidatePath(path);
		redirect(path);
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

		revalidatePath(path);
		redirect(path);
	}

	async function activateTenant() {
		'use server';
		await requireMasterAdminSession();

		await prisma.tenant.update({
			where: { id },
			data: { status: TenantStatus.ACTIVE },
		});

		revalidatePath(path);
		redirect(path);
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

		revalidatePath(path);
		redirect(path);
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

		revalidatePath(path);
		redirect(path);
	}

	async function updateStorageLimitBytes(formData: FormData) {
		'use server';
		await requireMasterAdminSession();

		const raw = formData.get('storageLimitBytes');
		const value = typeof raw === 'string' ? raw.trim() : '';
		if (!/^\d+$/.test(value)) {
			throw new Error('INVALID_STORAGE_LIMIT');
		}

		const limit = BigInt(value);
		if (limit <= BigInt(0)) {
			throw new Error('INVALID_STORAGE_LIMIT');
		}

		await prisma.tenant.update({
			where: { id },
			data: { storageLimitBytes: limit },
		});

		revalidatePath(path);
		redirect(path);
	}

	async function updateStorageEnforced(formData: FormData) {
		'use server';
		await requireMasterAdminSession();

		const raw = formData.get('storageEnforced');
		if (raw !== 'true' && raw !== 'false') {
			throw new Error('INVALID_STORAGE_ENFORCED');
		}

		const storageEnforced = raw === 'true';

		await prisma.tenant.update({
			where: { id },
			data: { storageEnforced },
		});

		revalidatePath(path);
		redirect(path);
	}

	async function adminRepairStorageUsedBytes(formData: FormData) {
		'use server';
		await requireMasterAdminSession();

		const raw = formData.get('storageUsedBytes');
		const value = typeof raw === 'string' ? raw.trim() : '';
		if (!/^\d+$/.test(value)) {
			throw new Error('INVALID_STORAGE_USED');
		}

		const used = BigInt(value);
		if (used < BigInt(0)) {
			throw new Error('INVALID_STORAGE_USED');
		}

		await prisma.tenant.update({
			where: { id },
			data: { storageUsedBytes: used },
		});

		revalidatePath(path);
		redirect(path);
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
					<strong>Storage Used:</strong> {tenant.storageUsedBytes.toString()}
				</div>
				<div>
					<strong>Storage Limit:</strong> {tenant.storageLimitBytes.toString()}
				</div>
				<div>
					<strong>Storage Enforced:</strong>{' '}
					{tenant.storageEnforced ? 'true' : 'false'}
				</div>
				<div>
					<strong>Created At:</strong> {tenant.createdAt.toISOString()}
				</div>
			</div>

			<div className="border border-gray-300 p-4 space-y-4">
				<h2 className="text-xl font-bold">Storage</h2>
				<div className="space-y-2">
					<div>
						<strong>Used:</strong> {tenant.storageUsedBytes.toString()}
					</div>
					<div>
						<strong>Limit:</strong> {tenant.storageLimitBytes.toString()}
					</div>
					<div>
						<strong>Enforced:</strong> {tenant.storageEnforced ? 'true' : 'false'}
					</div>
				</div>

				<form action={updateStorageLimitBytes} className="space-y-2">
					<input
						type="number"
						name="storageLimitBytes"
						defaultValue={tenant.storageLimitBytes.toString()}
						className="border border-gray-300 px-2 py-1 rounded"
						required
						min={1}
						step={1}
					/>
					<button
						type="submit"
						className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
					>
						Update Storage Limit
					</button>
				</form>

				<form action={updateStorageEnforced} className="space-y-2">
					<select
						name="storageEnforced"
						defaultValue={tenant.storageEnforced ? 'true' : 'false'}
						className="border border-gray-300 px-2 py-1 rounded"
						required
					>
						<option value="true">true</option>
						<option value="false">false</option>
					</select>
					<button
						type="submit"
						className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
					>
						Update Storage Enforcement
					</button>
				</form>

				<form action={adminRepairStorageUsedBytes} className="space-y-2">
					<input
						type="number"
						name="storageUsedBytes"
						defaultValue={tenant.storageUsedBytes.toString()}
						className="border border-gray-300 px-2 py-1 rounded"
						required
						min={0}
						step={1}
					/>
					<button
						type="submit"
						className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
					>
						Repair Storage Used
					</button>
				</form>
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
