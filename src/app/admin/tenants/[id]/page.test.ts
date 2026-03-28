
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



let overridePurchaseStatus: (formData: FormData) => Promise<void>;
beforeEach(async () => {
  vi.clearAllMocks();
  // Use dynamic import to get the function from the module
  const mod = await import("./page");
  overridePurchaseStatus = mod.overridePurchaseStatus as (formData: FormData) => Promise<void>;
});

describe("overridePurchaseStatus", () => {



  it("calls markPurchaseCompleted for COMPLETED", async () => {
    const formData = new (class extends FormData {
      private map = new Map<string, string>([
        ["purchaseId", "pid1"],
        ["status", "COMPLETED"],
      ]);
      get(name: string) { return this.map.get(name) ?? null; }
    })() as FormData;
    await overridePurchaseStatus(formData);
    expect(markPurchaseCompleted).toHaveBeenCalledWith("pid1", "admin_override");
    expect(revalidatePath).toHaveBeenCalled();
    expect(redirect).toHaveBeenCalled();
  });


  it("calls prisma.purchase.update for REFUNDED", async () => {
    const formData = new (class extends FormData {
      private map = new Map<string, string>([
        ["purchaseId", "pid2"],
        ["status", "REFUNDED"],
      ]);
      get(name: string) { return this.map.get(name) ?? null; }
    })() as FormData;
    await overridePurchaseStatus(formData);
    expect(prisma.purchase.update).toHaveBeenCalledWith({
      where: { id: "pid2" },
      data: expect.objectContaining({ status: "REFUNDED", refundedAt: expect.any(Date) }),
    });
    expect(revalidatePath).toHaveBeenCalled();
    expect(redirect).toHaveBeenCalled();
  });


  it("calls prisma.purchase.update for PENDING", async () => {
    const formData = new (class extends FormData {
      private map = new Map<string, string>([
        ["purchaseId", "pid3"],
        ["status", "PENDING"],
      ]);
      get(name: string) { return this.map.get(name) ?? null; }
    })() as FormData;
    await overridePurchaseStatus(formData);
    expect(prisma.purchase.update).toHaveBeenCalledWith({
      where: { id: "pid3" },
      data: { status: "PENDING" },
    });
    expect(revalidatePath).toHaveBeenCalled();
    expect(redirect).toHaveBeenCalled();
  });
});
