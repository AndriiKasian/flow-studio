import { describe, expect, it, vi } from "vitest";

import {
  createFitViewRequest,
  getFitViewDecision,
  processFitViewRequest,
  type FitViewRequest,
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

describe("processFitViewRequest", () => {
  function createRequestRef(): { current: FitViewRequest | null } {
    return { current: createFitViewRequest(nodes, true) };
  }

  it("keeps the request while nodes are being measured", () => {
    const requestRef = createRequestRef();
    const fitView = vi.fn(() => Promise.resolve());
    const onComplete = vi.fn();

    processFitViewRequest(requestRef, ["a", "b"], false, fitView, onComplete);

    expect(requestRef.current).not.toBeNull();
    expect(fitView).not.toHaveBeenCalled();
    expect(onComplete).not.toHaveBeenCalled();
  });

  it("completes once even when re-run before fitting settles", async () => {
    const requestRef = createRequestRef();
    let resolveFit: () => void = () => {};
    const fitView = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveFit = resolve;
        }),
    );
    const onComplete = vi.fn();

    processFitViewRequest(requestRef, ["a", "b"], true, fitView, onComplete);
    // A re-render re-runs the effect while fitView is still animating.
    processFitViewRequest(requestRef, ["a", "b"], true, fitView, onComplete);

    expect(fitView).toHaveBeenCalledTimes(1);
    expect(onComplete).not.toHaveBeenCalled();

    resolveFit();
    await vi.waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
  });

  it("completes when fitting fails", async () => {
    const fitView = vi.fn(() => Promise.reject(new Error("fit failed")));
    const onComplete = vi.fn();

    processFitViewRequest(
      createRequestRef(),
      ["a", "b"],
      true,
      fitView,
      onComplete,
    );

    await vi.waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
  });

  it("completes without fitting when the request is discarded", () => {
    const requestRef = createRequestRef();
    const fitView = vi.fn(() => Promise.resolve());
    const onComplete = vi.fn();

    processFitViewRequest(requestRef, ["a"], true, fitView, onComplete);

    expect(requestRef.current).toBeNull();
    expect(fitView).not.toHaveBeenCalled();
    expect(onComplete).toHaveBeenCalledTimes(1);
  });
});
