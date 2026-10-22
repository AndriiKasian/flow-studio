import { workflowGraphSchema } from "@flow-studio/shared";
import request from "supertest";
import { afterEach, describe, expect, it } from "vitest";

import { app } from "../../app.js";
import { createFlowTestContext } from "./helpers/flow-test-context.js";

describe("Flows API - SSE", () => {
  const { trackCreatedFlow, cleanup } = createFlowTestContext();

  afterEach(cleanup);

  const graph = workflowGraphSchema.parse({
    nodes: [
      {
        id: "input-1",
        type: "textInput",
        position: { x: 0, y: 0 },
        data: { text: "hello" },
      },
      {
        id: "output-1",
        type: "textOutput",
        position: { x: 200, y: 0 },
        data: {},
      },
    ],
    edges: [
      {
        id: "edge-1",
        source: "input-1",
        sourceHandle: "text",
        target: "output-1",
        targetHandle: "input",
      },
    ],
  });

  it("streams execution events for an unsaved graph", async () => {
    const createResponse = await request(app)
      .post("/flows")
      .send({ name: "SSE Test Flow" });

    expect(createResponse.status).toBe(201);

    const flow = trackCreatedFlow(createResponse.body);

    // No Save: execute the graph supplied in the POST body.
    const response = await request(app)
      .post(`/flows/${flow.id}/execute/stream`)
      .send(graph)
      .buffer(true)
      .parse((res, callback) => {
        let body = "";

        res.setEncoding("utf8");

        res.on("data", (chunk: string) => {
          body += chunk;
        });

        res.on("end", () => callback(null, body));
        res.on("error", callback);
      });

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toContain(
      "text/event-stream",
    );

    const body = response.body as string;

    expect(body).toContain("event: flow:start");
    expect(body).toContain("event: node:start");
    expect(body).toContain("event: node:stop");
    expect(body).toContain("event: flow:stop");

    expect(body.indexOf("event: flow:start")).toBeLessThan(
      body.indexOf("event: node:start"),
    );

    expect(body.indexOf("event: node:start")).toBeLessThan(
      body.indexOf("event: node:stop"),
    );

    expect(body.indexOf("event: node:stop")).toBeLessThan(
      body.indexOf("event: flow:stop"),
    );
  });

  it("returns 400 when the execution graph is missing", async () => {
    const createResponse = await request(app)
      .post("/flows")
      .send({ name: "Missing Graph Test" });

    expect(createResponse.status).toBe(201);

    const flow = trackCreatedFlow(createResponse.body);

    const response = await request(app)
      .post(`/flows/${flow.id}/execute/stream`)
      .send({});

    expect(response.status).toBe(400);

    const responseBody: unknown = response.body;
    expect(responseBody).toMatchObject({
      error: "Invalid workflow graph",
    });
  });

  describe("inactive Prompt Template connections", () => {
    // Text Input A is connected to the port of a variable that was removed
    // from the template; Text Input B feeds the active variable.
    const createInactiveGraph = (template: string) =>
      workflowGraphSchema.parse({
        nodes: [
          {
            id: "input-a",
            type: "textInput",
            position: { x: 0, y: 0 },
            data: { text: "vasya" },
          },
          {
            id: "input-b",
            type: "textInput",
            position: { x: 0, y: 200 },
            data: { text: "hola" },
          },
          {
            id: "prompt",
            type: "promptTemplate",
            position: { x: 300, y: 100 },
            data: {
              template,
              inputs: [
                { id: "port-ololo", name: "ololo" },
                { id: "port-name", name: "name" },
              ],
            },
          },
          {
            id: "output",
            type: "textOutput",
            position: { x: 600, y: 100 },
            data: {},
          },
        ],
        edges: [
          {
            id: "edge-a",
            source: "input-a",
            sourceHandle: "text",
            target: "prompt",
            targetHandle: "port-name",
          },
          {
            id: "edge-b",
            source: "input-b",
            sourceHandle: "text",
            target: "prompt",
            targetHandle: "port-ololo",
          },
          {
            id: "edge-output",
            source: "prompt",
            sourceHandle: "prompt",
            target: "output",
            targetHandle: "input",
          },
        ],
      });

    async function streamEvents(
      flowId: string,
      graph: unknown,
    ): Promise<unknown[]> {
      const response = await request(app)
        .post(`/flows/${flowId}/execute/stream`)
        .send(graph as object)
        .buffer(true)
        .parse((res, callback) => {
          let body = "";

          res.setEncoding("utf8");
          res.on("data", (chunk: string) => {
            body += chunk;
          });
          res.on("end", () => callback(null, body));
          res.on("error", callback);
        });

      expect(response.status).toBe(200);

      return (response.body as string)
        .split("\n")
        .filter((line) => line.startsWith("data: "))
        .map((line): unknown => JSON.parse(line.slice(6)));
    }

    async function createSavedFlow(graph: unknown) {
      const createResponse = await request(app)
        .post("/flows")
        .send({ name: "Inactive Port Flow" });

      expect(createResponse.status).toBe(201);

      const flow = trackCreatedFlow(createResponse.body);

      const saveResponse = await request(app)
        .put(`/flows/${flow.id}/graph`)
        .send(graph as object);

      expect(saveResponse.status).toBe(200);

      return flow;
    }

    it("does not execute the source of an inactive connection", async () => {
      const graph = createInactiveGraph("{{ololo}}");
      const flow = await createSavedFlow(graph);

      const events = await streamEvents(flow.id, graph);

      expect(events).toEqual([
        { type: "flow:start" },
        { type: "node:start", nodeId: "input-b" },
        {
          type: "node:stop",
          nodeId: "input-b",
          status: "completed",
          outputs: { text: "hola" },
        },
        { type: "node:start", nodeId: "prompt" },
        {
          type: "node:stop",
          nodeId: "prompt",
          status: "completed",
          outputs: { prompt: "hola" },
        },
        { type: "node:start", nodeId: "output" },
        {
          type: "node:stop",
          nodeId: "output",
          status: "completed",
          outputs: { result: "hola" },
        },
        { type: "flow:stop", status: "completed" },
      ]);

      // The inactive connection stays in the stored, editable graph.
      const storedResponse = await request(app).get(
        `/flows/${flow.id}`,
      );

      expect(storedResponse.status).toBe(200);
      expect(storedResponse.body).toMatchObject({ graph });
    });

    it("reactivates the original connection when the variable is restored", async () => {
      const graph = createInactiveGraph("{{name}}");
      const flow = await createSavedFlow(graph);

      const events = await streamEvents(flow.id, graph);

      expect(events).toContainEqual({
        type: "node:stop",
        nodeId: "output",
        status: "completed",
        outputs: { result: "vasya" },
      });

      expect(events).not.toContainEqual({
        type: "node:start",
        nodeId: "input-b",
      });
    });
  });

  it("streams actionable node errors to the editor", async () => {
    const createResponse = await request(app)
      .post("/flows")
      .send({ name: "SSE Failure Flow" });

    expect(createResponse.status).toBe(201);

    const flow = trackCreatedFlow(createResponse.body);

    const failingGraph = workflowGraphSchema.parse({
      nodes: [
        {
          id: "input-1",
          type: "textInput",
          position: { x: 0, y: 0 },
          data: { text: "hello" },
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

    const response = await request(app)
      .post(`/flows/${flow.id}/execute/stream`)
      .send(failingGraph)
      .buffer(true)
      .parse((res, callback) => {
        let body = "";

        res.setEncoding("utf8");
        res.on("data", (chunk: string) => {
          body += chunk;
        });
        res.on("end", () => callback(null, body));
        res.on("error", callback);
      });

    expect(response.status).toBe(200);

    const events = (response.body as string)
      .split("\n")
      .filter((line) => line.startsWith("data: "))
      .map((line): unknown => JSON.parse(line.slice(6)));

    expect(events).toContainEqual({
      type: "node:stop",
      nodeId: "transform-1",
      status: "failed",
      error: "Text Transform requires an operation",
    });

    expect(events).toContainEqual({
      type: "flow:stop",
      status: "failed",
      error:
        'Node "transform-1" failed: Text Transform requires an operation',
    });
  });

  it("returns 404 when streaming a nonexistent flow", async () => {
    const response = await request(app)
      .post("/flows/nonexistent-flow-id/execute/stream")
      .send(graph);

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      error: "Flow not found",
    });
  });
});