import { describe, it, expect, vi, beforeEach } from "vitest";

const mockQueryRawUnsafe = vi.fn();

vi.mock("@/db/prisma", () => ({
  prisma: { $queryRawUnsafe: (...args: unknown[]) => mockQueryRawUnsafe(...args) },
}));

import { GET } from "./route";

describe("GET /api/debug/db", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns ok:true when query succeeds", async () => {
    mockQueryRawUnsafe.mockResolvedValue([{ "?column?": 1 }]);
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it("returns 500 with error on failure", async () => {
    const err = Object.assign(new Error("connection refused"), { code: "P1001" });
    mockQueryRawUnsafe.mockRejectedValue(err);
    const res = await GET();
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toBe("connection refused");
    expect(body.code).toBe("P1001");
  });

  it("omits code when not present", async () => {
    mockQueryRawUnsafe.mockRejectedValue(new Error("boom"));
    const res = await GET();
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.code).toBeUndefined();
  });
});
