import {
  flowSchema,
  workflowGraphSchema,
} from "@flow-studio/shared";
import request from "supertest";
import { afterEach, describe, expect, it } from "vitest";

import { app } from "../../app.js";
import { createFlowTestContext } from "./helpers/flow-test-context.js";
import { prisma } from "../../lib/prisma.js";

describe("Flows API - Graph", () => {
  const { trackCreatedFlow, cleanup } = createFlowTestContext();

  afterEach(cleanup);

  it("saves a workflow graph", async () => {
    const createResponse = await request(app)
      .post("/flows")
      .send({ name: "Flow With Graph" });

    expect(createResponse.status).toBe(201);

    const createdFlow = trackCreatedFlow(createResponse.body);

    const graph = {
      nodes: [
        {
          id: "input-1",
          type: "textInput",
          position: { x: 100, y: 200 },
          data: { text: "Hello world" },
        },
        {
          id: "output-1",
          type: "textOutput",
          position: { x: 400, y: 200 },
          data: {},
        },
      ],
      edges: [
        {
          id: "edge-1",
          source: "input-1",
          target: "output-1",
          sourceHandle: "text",
          targetHandle: "input",
          type: "workflow",
        },
      ],
    };

    const response = await request(app)
      .put(`/flows/${createdFlow.id}/graph`)
      .send(graph);

    expect(response.status).toBe(200);

    const responseBody: unknown = response.body;

    const savedFlow = flowSchema.extend({
      graph: workflowGraphSchema,
    }).parse(responseBody);

    expect(savedFlow.graph).toEqual(graph);
  });

  it("persists a workflow graph across requests", async () => {
    const createResponse = await request(app)
      .post("/flows")
      .send({ name: "Persistent Graph" });

    expect(createResponse.status).toBe(201);

    const createdFlow = trackCreatedFlow(createResponse.body);

    const graph = {
      nodes: [
        {
          id: "node-1",
          type: "llm",
          position: { x: 150, y: 250 },
          data: {
            model: "claude-sonnet",
            systemPrompt: "You are a helpful assistant.",
            temperature: 0.7,
          },
        },
      ],
      edges: [],
    };

    const saveResponse = await request(app)
      .put(`/flows/${createdFlow.id}/graph`)
      .send(graph);

    expect(saveResponse.status).toBe(200);

    const getResponse = await request(app).get(
      `/flows/${createdFlow.id}`,
    );

    expect(getResponse.status).toBe(200);

    const responseBody: unknown = getResponse.body;

    const persistedFlow = flowSchema.extend({
      graph: workflowGraphSchema,
    }).parse(responseBody);

    expect(persistedFlow.graph).toEqual(graph);
  });

  it("returns 400 for invalid node configuration", async () => {
    const createResponse = await request(app)
      .post("/flows")
      .send({ name: "Invalid Graph Test" });

    expect(createResponse.status).toBe(201);

    const createdFlow = trackCreatedFlow(createResponse.body);

    const response = await request(app)
      .put(`/flows/${createdFlow.id}/graph`)
      .send({
        nodes: [
          {
            id: "node-1",
            type: "llm",
            position: { x: 100, y: 100 },
            data: { temperature: "high" },
          },
        ],
        edges: [],
      });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty(
      "error",
      "Invalid workflow graph",
    );
  });

  it("normalizes legacy Text Output results when loading a flow", async () => {
    const createResponse = await request(app)
      .post("/flows")
      .send({ name: "Legacy Text Output Graph" });

    expect(createResponse.status).toBe(201);

    const createdFlow = trackCreatedFlow(createResponse.body);

    const legacyGraph = {
      nodes: [
        {
          id: "input-1",
          type: "textInput",
          position: { x: 100, y: 200 },
          data: { text: "Hello world" },
        },
        {
          id: "output-1",
          type: "textOutput",
          position: { x: 400, y: 200 },
          data: { result: "Old execution result" },
        },
      ],
      edges: [
        {
          id: "edge-1",
          source: "input-1",
          target: "output-1",
          sourceHandle: "text",
          targetHandle: "input",
          type: "workflow",
        },
      ],
    };

    await prisma.flow.update({
      where: { id: createdFlow.id },
      data: { graph: legacyGraph },
    });

    const response = await request(app).get(
      `/flows/${createdFlow.id}`,
    );

    expect(response.status).toBe(200);

    const responseBody: unknown = response.body;

    const loadedFlow = flowSchema.extend({
      graph: workflowGraphSchema,
    }).parse(responseBody);

    expect(loadedFlow.graph).toEqual({
      ...legacyGraph,
      nodes: [
        legacyGraph.nodes[0],
        {
          ...legacyGraph.nodes[1],
          data: {},
        },
      ],
    });
  });

  it("loads a newly created flow with a null graph", async () => {
    const createResponse = await request(app)
      .post("/flows")
      .send({ name: "New Empty Flow" });

    expect(createResponse.status).toBe(201);

    const createdFlow = trackCreatedFlow(createResponse.body);

    const getResponse = await request(app).get(
      `/flows/${createdFlow.id}`,
    );

    expect(getResponse.status).toBe(200);

    const responseBody: unknown = getResponse.body;

    const loadedFlow = flowSchema.extend({
      graph: workflowGraphSchema.nullable(),
    }).parse(responseBody);

    expect(loadedFlow.id).toBe(createdFlow.id);
    expect(loadedFlow.graph).toBeNull();
  });

  it("returns 404 when saving a graph to a nonexistent flow", async () => {
    const response = await request(app)
      .put("/flows/nonexistent-flow-id/graph")
      .send({
        nodes: [],
        edges: [],
      });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      error: "Resource not found",
    });
  });
});