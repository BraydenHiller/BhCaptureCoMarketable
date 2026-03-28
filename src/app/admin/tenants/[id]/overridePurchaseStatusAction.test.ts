vi.mock("@/lib/auth/requireMasterAdminSession", () => ({
  requireMasterAdminSession: () => Promise.resolve(),
}));
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/db/prisma", () => ({
  prisma: {
    purchase: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/db/purchase", () => ({
  markPurchaseCompleted: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  notFound: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { markPurchaseCompleted } from "@/db/purchase";
import { prisma } from "@/db/prisma";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { overridePurchaseStatusAction } from "./overridePurchaseStatusAction";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("overridePurchaseStatusAction", () => {
  it("calls markPurchaseCompleted for COMPLETED", async () => {
    await overridePurchaseStatusAction({
      purchaseId: "pid1",
      status: "COMPLETED",
      path: "/admin/tenants/tid1"
    });
    expect(markPurchaseCompleted).toHaveBeenCalledWith("pid1", "admin_override");
    expect(revalidatePath).toHaveBeenCalled();
    expect(redirect).toHaveBeenCalled();
  });

  it("calls prisma.purchase.update for REFUNDED", async () => {
    await overridePurchaseStatusAction({
      purchaseId: "pid2",
      status: "REFUNDED",
      path: "/admin/tenants/tid2"
    });
    expect(prisma.purchase.update).toHaveBeenCalledWith({
      where: { id: "pid2" },
      data: expect.objectContaining({ status: "REFUNDED", refundedAt: expect.any(Date) }),
    });
    expect(revalidatePath).toHaveBeenCalled();
    expect(redirect).toHaveBeenCalled();
  });

  it("calls prisma.purchase.update for PENDING", async () => {
    await overridePurchaseStatusAction({
      purchaseId: "pid3",
      status: "PENDING",
      path: "/admin/tenants/tid3"
    });
    expect(prisma.purchase.update).toHaveBeenCalledWith({
      where: { id: "pid3" },
      data: { status: "PENDING" },
    });
    expect(revalidatePath).toHaveBeenCalled();
    expect(redirect).toHaveBeenCalled();
  });
});
