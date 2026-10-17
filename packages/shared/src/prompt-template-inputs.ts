import { extractPromptVariables } from "./workflow-handles";

export interface PromptTemplateInput {
  id: string;
  name: string;
}

/**
 * Returns the ports referenced by the template, in variable order.
 *
 * Ports whose variable was removed from the template are inactive: they
 * keep their connection but provide no input. Legacy workflows without
 * stored inputs use variable names as port IDs.
 */
export function getActivePromptTemplateInputs(
  template: string,
  inputs: readonly PromptTemplateInput[] | undefined,
): PromptTemplateInput[] {
  const names = extractPromptVariables(template);

  if (!inputs) {
    return names.map((name) => ({ id: name, name }));
  }

  return names.flatMap((name) => {
    const input = inputs.find((item) => item.name === name);

    return input ? [input] : [];
  });
}

/**
 * Synchronizes template variables with stable input port IDs.
 *
 * A variable keeps its port ID for as long as its port is stored, so a
 * removed and re-added variable reactivates its original connection.
 * Removed variables stay stored as inactive ports only while connected.
 * Port IDs are never reassigned to a different variable.
 */
export function syncPromptTemplateInputs(
  template: string,
  previousInputs: readonly PromptTemplateInput[],
  connectedPortIds: ReadonlySet<string>,
  createId: () => string,
): PromptTemplateInput[] {
  const names = extractPromptVariables(template);

  const activeInputs = names.map(
    (name) =>
      previousInputs.find((input) => input.name === name) ?? {
        id: createId(),
        name,
      },
  );

  const inactiveInputs = previousInputs.filter(
    (input) =>
      !names.includes(input.name) && connectedPortIds.has(input.id),
  );

  return [...activeInputs, ...inactiveInputs];
}
