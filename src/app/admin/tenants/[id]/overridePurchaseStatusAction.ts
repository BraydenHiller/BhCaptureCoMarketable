import { requireMasterAdminSession } from '@/lib/auth/requireMasterAdminSession';
import { prisma } from '@/db/prisma';
import { markPurchaseCompleted } from '@/db/purchase';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { PurchaseStatus } from '@prisma/client';

export async function overridePurchaseStatusAction({
  purchaseId,
  status,
  path
}: {
  purchaseId: string;
  status: PurchaseStatus;
  path: string;
}) {
  'use server';
  await requireMasterAdminSession();
  if (!purchaseId || !Object.values(PurchaseStatus).includes(status)) {
    throw new Error('INVALID_PURCHASE_STATUS');
  }
  if (status === 'COMPLETED') {
    await markPurchaseCompleted(purchaseId, 'admin_override');
    revalidatePath(path);
    redirect(path);
  } else {
    const data: Record<string, unknown> = { status };
    if (status === 'REFUNDED') {
      data.refundedAt = new Date();
    }
    await prisma.purchase.update({
      where: { id: purchaseId },
      data,
    });
    revalidatePath(path);
    redirect(path);
  }
}
