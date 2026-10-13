import { flowSchema } from "@flow-studio/shared";

import { prisma } from "../../../lib/prisma.js";

export function createFlowTestContext() {
  const createdFlowIds = new Set<string>();

  function trackCreatedFlow(body: unknown) {
    const flow = flowSchema.parse(body);
    createdFlowIds.add(flow.id);
    return flow;
  }

  async function cleanup() {
    const ids = [...createdFlowIds];
    createdFlowIds.clear();

    if (ids.length === 0) {
      return;
    }

    await prisma.flow.deleteMany({
      where: {
        id: {
          in: ids,
        },
      },
    });
  }

  return {
    trackCreatedFlow,
    cleanup,
  };
}