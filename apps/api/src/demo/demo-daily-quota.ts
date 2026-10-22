import { prisma } from "../lib/prisma.js";

const DEMO_QUOTA_ID = "public-demo";
const MAX_DAILY_RUNS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface DemoQuotaResult {
  allowed: boolean;
  retryAfterSeconds: number | null;
}

export async function tryConsumeDemoDailyQuota(): Promise<DemoQuotaResult> {
  return prisma.$transaction(
    async (tx): Promise<DemoQuotaResult> => {
      await tx.$executeRaw`
        INSERT INTO "DemoQuota" ("id", "runsUsed", "windowStartedAt")
        VALUES (${DEMO_QUOTA_ID}, 0, NOW())
        ON CONFLICT ("id") DO NOTHING
      `;

      const rows = await tx.$queryRaw<
        Array<{
          runsUsed: number;
          windowStartedAt: Date;
        }>
      >`
        SELECT "runsUsed", "windowStartedAt"
        FROM "DemoQuota"
        WHERE "id" = ${DEMO_QUOTA_ID}
        FOR UPDATE
      `;

      const quota = rows[0];

      if (!quota) {
        throw new Error("Demo quota record not found");
      }

      const now = new Date();

      const elapsedMs =
        now.getTime() -
        quota.windowStartedAt.getTime();

      if (elapsedMs >= DAY_MS) {
        await tx.demoQuota.update({
          where: { id: DEMO_QUOTA_ID },
          data: {
            runsUsed: 1,
            windowStartedAt: now,
          },
        });

        return {
          allowed: true,
          retryAfterSeconds: null,
        };
      }

      if (quota.runsUsed >= MAX_DAILY_RUNS) {
        return {
          allowed: false,
          retryAfterSeconds: Math.max(
            1,
            Math.ceil((DAY_MS - elapsedMs) / 1000),
          ),
        };
      }

      await tx.demoQuota.update({
        where: { id: DEMO_QUOTA_ID },
        data: {
          runsUsed: { increment: 1 },
        },
      });

      return {
        allowed: true,
        retryAfterSeconds: null,
      };
    },
  );
}
