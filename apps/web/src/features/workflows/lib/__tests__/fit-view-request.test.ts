import { describe, expect, it } from "vitest";

import {
  createFitViewRequest,
  getFitViewDecision,
} from "../fit-view-request";

const nodes = [{ id: "a" }, { id: "b" }];

describe("createFitViewRequest", () => {
  it("does not request a fit for an empty workflow", () => {
    expect(createFitViewRequest([], false)).toBeNull();
  });

  it("requests a fit for the given nodes", () => {
    expect(createFitViewRequest(nodes, true)).toEqual({
      nodeIds: new Set(["a", "b"]),
      animate: true,
    });
  });
});

describe("getFitViewDecision", () => {
  const request = createFitViewRequest(nodes, true)!;

  it("waits until the requested nodes are measured", () => {
    expect(getFitViewDecision(request, ["a", "b"], false)).toBe("wait");
  });

  it("fits once the requested nodes are measured", () => {
    expect(getFitViewDecision(request, ["b", "a"], true)).toBe("fit");
  });

  it("fits an import whose node IDs match the previous canvas after re-measurement", () => {
    // Same IDs as the replaced nodes: imported nodes have no `measured`,
    // so React Flow reports them as uninitialized until re-measured.
    expect(getFitViewDecision(request, ["a", "b"], false)).toBe("wait");
    expect(getFitViewDecision(request, ["a", "b"], true)).toBe("fit");
  });

  it("discards the request when a node is added before it fits", () => {
    expect(getFitViewDecision(request, ["a", "b", "c"], true)).toBe(
      "discard",
    );
  });

  it("discards the request when a node is removed before it fits", () => {
    expect(getFitViewDecision(request, ["a"], false)).toBe("discard");
  });
});
