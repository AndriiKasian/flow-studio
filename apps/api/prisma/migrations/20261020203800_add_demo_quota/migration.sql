-- CreateTable
CREATE TABLE "DemoQuota" (
    "id" TEXT NOT NULL,
    "runsUsed" INTEGER NOT NULL DEFAULT 0,
    "windowStartedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DemoQuota_pkey" PRIMARY KEY ("id")
);
