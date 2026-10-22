/**
 * A pending request to fit the viewport to a specific set of nodes, created
 * when a workflow is opened or imported.
 */
export interface FitViewRequest {
  nodeIds: ReadonlySet<string>;
  animate: boolean;
}

export type FitViewDecision = "fit" | "wait" | "discard";

export function createFitViewRequest(
  nodes: readonly { id: string }[],
  animate: boolean,
): FitViewRequest | null {
  if (nodes.length === 0) {
    return null;
  }

  return {
    nodeIds: new Set(nodes.map((node) => node.id)),
    animate,
  };
}

/**
 * fitView() only includes measured nodes, so the request waits until every
 * requested node is on the canvas and measured. Once the canvas holds a
 * different set of nodes, the request no longer applies and is discarded.
 */
export function getFitViewDecision(
  request: FitViewRequest,
  nodeIds: readonly string[],
  nodesInitialized: boolean,
): FitViewDecision {
  const matchesRequest =
    nodeIds.length === request.nodeIds.size &&
    nodeIds.every((id) => request.nodeIds.has(id));

  if (!matchesRequest) {
    return "discard";
  }

  return nodesInitialized ? "fit" : "wait";
}

/**
 * Consumes the pending request and fits the viewport to it. Completion is
 * reported exactly once per consumed request, after fitting settles. It must
 * not be cancelled by a later re-run: the request is already consumed, so a
 * cancelled completion would never be reported (leaving the read-only demo
 * canvas hidden).
 */
export function processFitViewRequest(
  requestRef: { current: FitViewRequest | null },
  nodeIds: readonly string[],
  nodesInitialized: boolean,
  fitView: (request: FitViewRequest) => Promise<unknown>,
  onComplete?: () => void,
): void {
  const request = requestRef.current;

  if (!request) {
    return;
  }

  const decision = getFitViewDecision(request, nodeIds, nodesInitialized);

  if (decision === "wait") {
    return;
  }

  requestRef.current = null;

  if (decision === "discard") {
    onComplete?.();
    return;
  }

  void fitView(request)
    .catch(() => {
      // Do not leave the demo hidden if fitting fails.
    })
    .finally(() => {
      onComplete?.();
    });
}
