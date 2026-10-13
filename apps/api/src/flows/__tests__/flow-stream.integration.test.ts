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