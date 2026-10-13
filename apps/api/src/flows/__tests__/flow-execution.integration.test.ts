import { workflowGraphSchema } from "@flow-studio/shared";
import request from "supertest";
import { afterEach, describe, expect, it } from "vitest";

import { app } from "../../app.js";
import { createFlowTestContext } from "./helpers/flow-test-context.js";

describe("Flows API - Execution", () => {
  const { trackCreatedFlow, cleanup } = createFlowTestContext();

  afterEach(cleanup);

  it("executes a saved workflow", async () => {
    const createResponse = await request(app)
      .post("/flows")
      .send({ name: "Executable Flow" });

    expect(createResponse.status).toBe(201);

    const flow = trackCreatedFlow(createResponse.body);

    const graph = workflowGraphSchema.parse({
      nodes: [
        {
          id: "input-1",
          type: "textInput",
          position: { x: 0, y: 0 },
          data: { text: "  Hello World  " },
        },
        {
          id: "transform-1",
          type: "textTransform",
          position: { x: 200, y: 0 },
          data: { operation: "uppercase" },
        },
        {
          id: "output-1",
          type: "textOutput",
          position: { x: 400, y: 0 },
          data: {},
        },
      ],
      edges: [
        {
          id: "edge-1",
          source: "input-1",
          sourceHandle: "text",
          target: "transform-1",
          targetHandle: "input",
        },
        {
          id: "edge-2",
          source: "transform-1",
          sourceHandle: "output",
          target: "output-1",
          targetHandle: "input",
        },
      ],
    });

    const saveResponse = await request(app)
      .put(`/flows/${flow.id}/graph`)
      .send(graph);

    expect(saveResponse.status).toBe(200);

    const response = await request(app)
      .post(`/flows/${flow.id}/execute`);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      status: "completed",
      results: {
        "input-1": {
          status: "completed",
          outputs: { text: "  Hello World  " },
        },
        "transform-1": {
          status: "completed",
          outputs: { output: "  HELLO WORLD  " },
        },
        "output-1": {
          status: "completed",
          outputs: { result: "  HELLO WORLD  " },
        },
      },
    });
  });

  it("returns a failed execution for an unconfigured node", async () => {
    const createResponse = await request(app)
      .post("/flows")
      .send({ name: "Unconfigured Flow" });

    expect(createResponse.status).toBe(201);

    const flow = trackCreatedFlow(createResponse.body);

    const graph = workflowGraphSchema.parse({
      nodes: [
        {
          id: "input-1",
          type: "textInput",
          position: { x: 0, y: 0 },
          data: { text: "Hello" },
        },
        {
          id: "transform-1",
          type: "textTransform",
          position: { x: 200, y: 0 },
          data: {},
        },
      ],
      edges: [
        {
          id: "edge-1",
          source: "input-1",
          sourceHandle: "text",
          target: "transform-1",
          targetHandle: "input",
        },
      ],
    });

    const saveResponse = await request(app)
      .put(`/flows/${flow.id}/graph`)
      .send(graph);

    expect(saveResponse.status).toBe(200);

    const response = await request(app)
      .post(`/flows/${flow.id}/execute`);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      status: "failed",
      error: 'Node "transform-1" failed: Text Transform requires an operation',
      results: {
        "input-1": {
          status: "completed",
        },
        "transform-1": {
          status: "failed",
          error: "Text Transform requires an operation",
        },
      },
    });
  });

  it("returns 404 when executing a nonexistent flow", async () => {
    const response = await request(app)
      .post("/flows/nonexistent-flow-id/execute");

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      error: "Flow not found",
    });
  });
});