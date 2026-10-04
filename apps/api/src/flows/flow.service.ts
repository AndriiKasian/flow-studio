import { prisma } from "../lib/prisma.js";
import type { CreateFlowInput, UpdateFlowInput } from "@flow-studio/shared";

export function createFlow(data: CreateFlowInput) {
  return prisma.flow.create({
    data,
  });
}

export function getFlows() {
  return prisma.flow.findMany();
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