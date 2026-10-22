
import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { app } from "../../app.js";
import { prisma } from "../../lib/prisma.js";

const execution = vi.hoisted(() => ({
  run: vi.fn(),
}));

vi.mock("../../execution/execute-workflow.js", () => ({
  executeWorkflow: execution.run,
}));

describe("Public workflow execution security", () => {
  const flowIds: string[] = [];

  afterEach(async () => {
    execution.run.mockReset();

    await prisma.flow.deleteMany({
      where: { id: { in: flowIds } },
    });

    flowIds.length = 0;
  });

  async function createExecutableFlow() {
    const response = await request(app)
      .post("/flows")
      .send({ name: "Security Test" });

    expect(response.status).toBe(201);

    const body: unknown = response.body;

    const parsed = z.object({
      id: z.uuid(),
    }).parse(body);

    const id = parsed.id;
    flowIds.push(id);

    const graph = {
      nodes: [
        {
          id: "input",
          type: "textInput",
          position: { x: 0, y: 0 },
          data: { text: "Hello" },
        },
        {
          id: "output",
          type: "textOutput",
          position: { x: 200, y: 0 },
          data: {},
        },
      ],
      edges: [
        {
          id: "edge",
          source: "input",
          sourceHandle: "text",
          target: "output",
          targetHandle: "input",
        },
      ],
    };

    const saved = await request(app)
      .put(`/flows/${id}/graph`)
      .send(graph);

    expect(saved.status).toBe(200);

    return id;
  }

  it("rejects a fourth concurrent execution", async () => {
    const id = await createExecutableFlow();

    let releaseExecution!: () => void;

    const blocked = new Promise<void>((resolve) => {
      releaseExecution = resolve;
    });

    execution.run.mockImplementation(async () => {
      await blocked;

      return {
        status: "completed",
        results: {},
      };
    });

    const running = Array.from({ length: 3 }, () =>
      request(app)
        .post(`/flows/${id}/execute`)
        .then((response) => response),
    );

    try {
      await vi.waitFor(() => {
        expect(execution.run).toHaveBeenCalledTimes(3);
      });

      const fourth = await request(app)
        .post(`/flows/${id}/execute`);

      expect(fourth.status).toBe(503);
      expect(execution.run).toHaveBeenCalledTimes(3);
    } finally {
      releaseExecution();
      await Promise.all(running);
    }
  });

  it("releases execution slots after completion", async () => {
    const id = await createExecutableFlow();

    execution.run.mockResolvedValue({
      status: "completed",
      results: {},
    });

    for (let index = 0; index < 4; index++) {
      const response = await request(app)
        .post(`/flows/${id}/execute`);

      expect(response.status).toBe(200);
    }

    expect(execution.run).toHaveBeenCalledTimes(4);
  });

  describe("paid node execution", () => {
    const PAID_NODES_DISABLED = {
      error: "LLM and Web Search nodes are disabled for workflow execution.",
    };

    const paidGraph = {
      nodes: [
        {
          id: "input",
          type: "textInput",
          position: { x: 0, y: 0 },
          data: { text: "Hello" },
        },
        {
          id: "llm",
          type: "llm",
          position: { x: 200, y: 0 },
          data: {},
        },
        {
          id: "search",
          type: "webSearch",
          position: { x: 200, y: 200 },
          data: {},
        },
      ],
      edges: [
        {
          id: "edge-llm",
          source: "input",
          sourceHandle: "text",
          target: "llm",
          targetHandle: "prompt",
        },
        {
          id: "edge-search",
          source: "input",
          sourceHandle: "text",
          target: "search",
          targetHandle: "query",
        },
      ],
    };

    afterEach(() => {
      vi.unstubAllEnvs();
    });

    it.each([
      ["unset", undefined],
      ["development", "development"],
      ["misconfigured", "prod"],
    ])(
      "rejects streamed paid nodes when NODE_ENV is %s",
      async (_label, nodeEnv) => {
        vi.stubEnv("NODE_ENV", nodeEnv);
        vi.stubEnv("ALLOW_PAID_FLOW_NODES", undefined);

        const id = await createExecutableFlow();

        const response = await request(app)
          .post(`/flows/${id}/execute/stream`)
          .send(paidGraph);

        expect(response.status).toBe(400);
        expect(response.body).toEqual(PAID_NODES_DISABLED);
        expect(execution.run).not.toHaveBeenCalled();
      },
    );

    it("rejects saved paid nodes on the JSON execution endpoint", async () => {
      vi.stubEnv("NODE_ENV", undefined);

      const id = await createExecutableFlow();

      await prisma.flow.update({
        where: { id },
        data: { graph: paidGraph },
      });

      const response = await request(app)
        .post(`/flows/${id}/execute`);

      expect(response.status).toBe(400);
      expect(response.body).toEqual(PAID_NODES_DISABLED);
      expect(execution.run).not.toHaveBeenCalled();
    });

    it("allows paid nodes only when explicitly enabled outside production", async () => {
      vi.stubEnv("NODE_ENV", "development");
      vi.stubEnv("ALLOW_PAID_FLOW_NODES", "true");

      execution.run.mockResolvedValue({
        status: "completed",
        results: {},
      });

      const id = await createExecutableFlow();

      const response = await request(app)
        .post(`/flows/${id}/execute/stream`)
        .send(paidGraph);

      expect(response.status).toBe(200);
      expect(execution.run).toHaveBeenCalledTimes(1);
    });

    it.each([
      ["unset", undefined],
      ["misconfigured", "prod"],
    ])(
      "keeps paid nodes sandboxed when enabled but NODE_ENV is %s",
      async (_label, nodeEnv) => {
        vi.stubEnv("NODE_ENV", nodeEnv);
        vi.stubEnv("ALLOW_PAID_FLOW_NODES", "true");

        const id = await createExecutableFlow();

        const response = await request(app)
          .post(`/flows/${id}/execute/stream`)
          .send(paidGraph);

        expect(response.status).toBe(400);
        expect(response.body).toEqual({
          error: "Unsupported nodes or graph size.",
        });
        expect(execution.run).not.toHaveBeenCalled();
      },
    );

    it("keeps paid nodes blocked in production even when enabled", async () => {
      vi.stubEnv("NODE_ENV", "production");
      vi.stubEnv("ALLOW_PAID_FLOW_NODES", "true");

      const id = await createExecutableFlow();

      const response = await request(app)
        .post(`/flows/${id}/execute/stream`)
        .send(paidGraph);

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: "Unsupported nodes or graph size.",
      });
      expect(execution.run).not.toHaveBeenCalled();
    });
  });

  describe("graph sandbox", () => {
    afterEach(() => {
      vi.unstubAllEnvs();
    });

    it.each([
      ["unset", undefined],
      ["misconfigured", "prod"],
    ])(
      "rejects unsupported nodes on save when NODE_ENV is %s",
      async (_label, nodeEnv) => {
        const id = await createExecutableFlow();

        vi.stubEnv("NODE_ENV", nodeEnv);

        const response = await request(app)
          .put(`/flows/${id}/graph`)
          .send({
            nodes: [
              {
                id: "user-input",
                type: "userInput",
                position: { x: 0, y: 0 },
                data: {},
              },
            ],
            edges: [],
          });

        expect(response.status).toBe(400);
        expect(response.body).toEqual({
          error: "Unsupported nodes or graph size.",
        });
      },
    );

    it("rejects oversized graphs when NODE_ENV is unset", async () => {
      const id = await createExecutableFlow();

      vi.stubEnv("NODE_ENV", undefined);

      const nodes = Array.from({ length: 31 }, (_, index) => ({
        id: `output-${index}`,
        type: "textOutput",
        position: { x: index, y: 0 },
        data: {},
      }));

      const response = await request(app)
        .put(`/flows/${id}/graph`)
        .send({ nodes, edges: [] });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: "Unsupported nodes or graph size.",
      });
    });
  });
});
