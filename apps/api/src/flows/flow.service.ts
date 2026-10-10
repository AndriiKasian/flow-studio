
import type {
  CreateFlowInput,
  UpdateFlowInput,
  WorkflowGraph,
} from "@flow-studio/shared";
import { prisma } from "../lib/prisma.js";

export function createFlow(data: CreateFlowInput) {
  return prisma.flow.create({
    data,
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
