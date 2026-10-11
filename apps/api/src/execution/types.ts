
export type NodeOutputs = Record<string, unknown>;

export type NodeExecutionResult =
  | {
      status: "completed";
      outputs: NodeOutputs;
      activeHandles?: string[];
    }
  | {
      status: "skipped";
    }
  | {
      status: "failed";
      error: string;
    };
