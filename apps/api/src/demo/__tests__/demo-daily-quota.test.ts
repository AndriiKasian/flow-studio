import { beforeEach, describe, expect, it, vi } from "vitest";

const { transactionMock } = vi.hoisted(() => ({
  transactionMock: vi.fn(),
}));

vi.mock("../../lib/prisma.js", () => ({
  prisma: {
    $transaction: transactionMock,
  },
}));

describe("Demo daily quota", () => {
  beforeEach(() => {
    transactionMock.mockReset();
  });

  it("allows a run when the quota is available", async () => {
    transactionMock.mockResolvedValue({
      allowed: true,
      retryAfterSeconds: null,
    });

    const { tryConsumeDemoDailyQuota } = await import(
      "../demo-daily-quota.js"
    );

    const result = await tryConsumeDemoDailyQuota();

    expect(result).toEqual({ allowed: true, retryAfterSeconds: null });
    expect(transactionMock).toHaveBeenCalledOnce();
  });

  it("rejects a run when the quota is exhausted", async () => {
    transactionMock.mockResolvedValue({
      allowed: false,
      retryAfterSeconds: 3600,
    });

    const { tryConsumeDemoDailyQuota } = await import(
      "../demo-daily-quota.js"
    );

    const result = await tryConsumeDemoDailyQuota();

    expect(result).toEqual({ allowed: false, retryAfterSeconds: 3600 });
  });

  it("rejects execution when PostgreSQL fails", async () => {
    transactionMock.mockRejectedValue(
      new Error("Database unavailable"),
    );

    const { tryConsumeDemoDailyQuota } = await import(
      "../demo-daily-quota.js"
    );

    await expect(
      tryConsumeDemoDailyQuota(),
    ).rejects.toThrow("Database unavailable");
  });
});
