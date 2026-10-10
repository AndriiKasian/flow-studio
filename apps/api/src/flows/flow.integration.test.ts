import {
  flowSchema,
  workflowGraphSchema,
} from "@flow-studio/shared";
import request from "supertest";
import { describe, expect, it } from "vitest";

import { app } from "../app.js";

describe("Flows API", () => {
  it("creates a flow", async () => {
    const response = await request(app)
      .post("/flows")
      .send({
        name: "Integration Test Flow",
        description: "Created by integration test",
      });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      name: "Integration Test Flow",
      description: "Created by integration test",
    });
    expect(response.body).toHaveProperty("id");
  });

  it("returns 400 when flow name is empty", async () => {
    const response = await request(app)
      .post("/flows")
      .send({
        name: "",
        description: "Invalid flow",
      });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty("error", "Invalid request");
  });

  it("normalizes missing description to null", async () => {
    const response = await request(app)
      .post("/flows")
      .send({
        name: "Flow Without Description",
      });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      name: "Flow Without Description",
      description: null,
    });
  });

  it("returns created flows", async () => {
    const createResponse = await request(app)
      .post("/flows")
      .send({
        name: "Flow For List Test",
        description: "Should appear in flows list",
      });

    expect(createResponse.status).toBe(201);

    const createdFlow = flowSchema.parse(createResponse.body);

    const response = await request(app).get("/flows");

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: createdFlow.id,
          name: "Flow For List Test",
          description: "Should appear in flows list",
        }),
      ]),
    );
  });

  it("updates a flow", async () => {
    const createResponse = await request(app)
      .post("/flows")
      .send({
        name: "Flow Before Update",
        description: "Before update",
      });

    expect(createResponse.status).toBe(201);

    const createdFlow = flowSchema.parse(createResponse.body);

    const response = await request(app)
      .patch(`/flows/${createdFlow.id}`)
      .send({
        name: "Flow After Update",
        description: "After update",
      });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      id: createdFlow.id,
      name: "Flow After Update",
      description: "After update",
    });
  });

  it("deletes a flow", async () => {
    const createResponse = await request(app)
      .post("/flows")
      .send({
        name: "Flow To Delete",
        description: "Should be deleted",
      });

    expect(createResponse.status).toBe(201);

    const createdFlow = flowSchema.parse(createResponse.body);

    const deleteResponse = await request(app).delete(
      `/flows/${createdFlow.id}`,
    );

    expect(deleteResponse.status).toBe(204);

    const getResponse = await request(app).get(
      `/flows/${createdFlow.id}`,
    );

    expect(getResponse.status).toBe(404);
  });

  it("returns flows ordered by most recently updated", async () => {
    const firstCreateResponse = await request(app)
      .post("/flows")
      .send({
        name: "Older Flow",
        description: "Created first",
      });

    expect(firstCreateResponse.status).toBe(201);

    const firstFlow = flowSchema.parse(firstCreateResponse.body);

    const secondCreateResponse = await request(app)
      .post("/flows")
      .send({
        name: "Newer Flow",
        description: "Created second",
      });

    expect(secondCreateResponse.status).toBe(201);

    const secondFlow = flowSchema.parse(secondCreateResponse.body);

    const updateResponse = await request(app)
      .patch(`/flows/${firstFlow.id}`)
      .send({
        name: "Older Flow Updated",
      });

    expect(updateResponse.status).toBe(200);

    const response = await request(app).get("/flows");

    expect(response.status).toBe(200);

    const flows = flowSchema.array().parse(response.body);

    const updatedFlowIndex = flows.findIndex(
      (flow) => flow.id === firstFlow.id,
    );
    const secondFlowIndex = flows.findIndex(
      (flow) => flow.id === secondFlow.id,
    );

    expect(updatedFlowIndex).toBeGreaterThanOrEqual(0);
    expect(secondFlowIndex).toBeGreaterThanOrEqual(0);
    expect(updatedFlowIndex).toBeLessThan(secondFlowIndex);
  });

  it("returns 404 when updating a nonexistent flow", async () => {
    const response = await request(app)
      .patch("/flows/nonexistent-flow-id")
      .send({
        name: "Updated Flow",
      });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      error: "Resource not found",
    });
  });

  it("returns 404 when deleting a nonexistent flow", async () => {
    const response = await request(app).delete(
      "/flows/nonexistent-flow-id",
    );

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      error: "Resource not found",
    });
  });


  it("saves a workflow graph", async () => {
    const createResponse = await request(app)
      .post("/flows")
      .send({ name: "Flow With Graph" });

    expect(createResponse.status).toBe(201);

    const createdFlow = flowSchema.parse(createResponse.body);

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

    const createdFlow = flowSchema.parse(createResponse.body);

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

    const createdFlow = flowSchema.parse(createResponse.body);

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