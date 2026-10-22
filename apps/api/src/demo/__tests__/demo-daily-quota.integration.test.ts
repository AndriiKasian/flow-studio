import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { prisma } from "../../lib/prisma.js";
import { tryConsumeDemoDailyQuota } from "../demo-daily-quota.js";

const QUOTA_ID = "public-demo";
const MAX_DAILY_RUNS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

describe("Demo daily quota PostgreSQL integration", () => {
  beforeEach(async () => {
    await prisma.demoQuota.deleteMany({
      where: { id: QUOTA_ID },
    });
  });

  afterAll(async () => {
    await prisma.demoQuota.deleteMany({
      where: { id: QUOTA_ID },
    });

    await prisma.$disconnect();
  });

  it("allows only one request when one run remains", async () => {
    await prisma.demoQuota.create({
      data: {
        id: QUOTA_ID,
        runsUsed: MAX_DAILY_RUNS - 1,
        windowStartedAt: new Date(),
      },
    });

    const results = await Promise.all([
      tryConsumeDemoDailyQuota(),
      tryConsumeDemoDailyQuota(),
    ]);

    expect(results.filter((result) => result.allowed)).toHaveLength(1);
    expect(results.filter((result) => !result.allowed)).toHaveLength(1);

    const quota = await prisma.demoQuota.findUniqueOrThrow({
      where: { id: QUOTA_ID },
    });

    expect(quota.runsUsed).toBe(MAX_DAILY_RUNS);
  });

  it("rejects requests when the quota is exhausted", async () => {
    await prisma.demoQuota.create({
      data: {
        id: QUOTA_ID,
        runsUsed: MAX_DAILY_RUNS,
        windowStartedAt: new Date(),
      },
    });

    const allowed = await tryConsumeDemoDailyQuota();

    expect(allowed.allowed).toBe(false);
    expect(allowed.retryAfterSeconds).toBeGreaterThan(0);

    const quota = await prisma.demoQuota.findUniqueOrThrow({
      where: { id: QUOTA_ID },
    });

    expect(quota.runsUsed).toBe(MAX_DAILY_RUNS);
  });

  it("resets the quota after 24 hours", async () => {
    await prisma.demoQuota.create({
      data: {
        id: QUOTA_ID,
        runsUsed: MAX_DAILY_RUNS,
        windowStartedAt: new Date(Date.now() - DAY_MS - 60_000),
      },
    });

    const allowed = await tryConsumeDemoDailyQuota();

    expect(allowed).toEqual({ allowed: true, retryAfterSeconds: null });

    const quota = await prisma.demoQuota.findUniqueOrThrow({
      where: { id: QUOTA_ID },
    });

    expect(quota.runsUsed).toBe(1);
    expect(quota.windowStartedAt.getTime()).toBeGreaterThan(
      Date.now() - 60_000,
    );
  });
});
