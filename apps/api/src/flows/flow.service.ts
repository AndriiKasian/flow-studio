import { prisma } from "../lib/prisma.js";

export function createFlow(name: string) {
  return prisma.flow.create({
    data: {
      name,
    },
  });
}

export function getFlows() {
  return prisma.flow.findMany();
}