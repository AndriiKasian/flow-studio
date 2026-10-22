import type {
  CreateFlowInput,
  UpdateFlowInput,
  WorkflowGraph,
} from "@flow-studio/shared";
import { prisma } from "../lib/prisma.js";

export const MAX_WORKFLOWS = 10;

export async function createFlow(data: CreateFlowInput) {
  return prisma.$transaction(async (tx) => {
    // Serialize concurrent creates across all API instances. The literal
    // (824719, 15) is the advisory lock key reserved for flow creation.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(824719, 15)`;
    const count = await tx.flow.count();
    if (count >= MAX_WORKFLOWS) {
      return null;
    }
    return tx.flow.create({ data });
  });
}

export function getFlows() {
  return prisma.flow.findMany({
    orderBy: {
      updatedAt: "desc",
    },
  });
}

export function getFlowById(id: string) {
  return prisma.flow.findUnique({
    where: { id },
  });
}

export function updateFlow(id: string, data: UpdateFlowInput) {
  return prisma.flow.update({
    where: { id },
    data,
  });
}

export function deleteFlow(id: string) {
  return prisma.flow.delete({
    where: { id },
  });
}

export function saveFlowGraph(id: string, graph: WorkflowGraph) {
  return prisma.flow.update({
    where: { id },
    data: {
      graph,
    },
  });
}
