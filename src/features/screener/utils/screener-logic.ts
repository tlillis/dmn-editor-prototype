import type { DMNModel, InputData, Decision } from '../../../types/dmn'

/**
 * Find "leaf" decisions - decisions that no other decision depends on.
 * These are typically the final outcomes we care about.
 */
export function findLeafDecisions(model: DMNModel): Decision[] {
  // Build a set of all decision IDs that are dependencies
  const dependedUpon = new Set<string>()

  for (const decision of model.decisions) {
    for (const req of decision.informationRequirements) {
      if (req.type === 'decision') {
        dependedUpon.add(req.href)
      }
    }
  }

  // Leaf decisions are those not depended upon by any other decision
  return model.decisions.filter((d) => !dependedUpon.has(d.id))
}

/**
 * Get all inputs required to evaluate a specific decision (recursively).
 */
export function getRequiredInputsForDecision(
  model: DMNModel,
  decisionId: string,
  visited = new Set<string>()
): Set<string> {
  const requiredInputs = new Set<string>()

  if (visited.has(decisionId)) return requiredInputs
  visited.add(decisionId)

  const decision = model.decisions.find((d) => d.id === decisionId)
  if (!decision) return requiredInputs

  for (const req of decision.informationRequirements) {
    if (req.type === 'input') {
      requiredInputs.add(req.href)
    } else if (req.type === 'decision') {
      // Recursively get inputs for dependent decisions
      const subInputs = getRequiredInputsForDecision(model, req.href, visited)
      subInputs.forEach((id) => requiredInputs.add(id))
    }
  }

  return requiredInputs
}

/**
 * Get all inputs required to evaluate any of the leaf decisions.
 */
export function getRequiredInputsForLeafDecisions(
  model: DMNModel
): InputData[] {
  const leafDecisions = findLeafDecisions(model)
  const allRequiredInputIds = new Set<string>()

  for (const decision of leafDecisions) {
    const inputs = getRequiredInputsForDecision(model, decision.id)
    inputs.forEach((id) => allRequiredInputIds.add(id))
  }

  // Return InputData objects in the order they appear in the model
  return model.inputs.filter((input) => allRequiredInputIds.has(input.id))
}

/**
 * Get questions in a simple, sensible order.
 * For now: just use the order inputs appear in the model.
 * The model author can control order by arranging inputs.
 *
 * Future: Add smart ordering based on dependency analysis.
 */
export function getQuestionOrder(model: DMNModel): InputData[] {
  return getRequiredInputsForLeafDecisions(model)
}

/**
 * Format a value for display.
 */
export function formatValue(value: unknown): string {
  if (value === null || value === undefined) return 'N/A'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (typeof value === 'number') {
    // Format currency-like values
    if (Number.isInteger(value) || value.toString().includes('.')) {
      return value.toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      })
    }
    return value.toString()
  }
  return String(value)
}

/**
 * Generate a question string from an input.
 * For now, just formats the name nicely. Later could use custom questionText.
 */
export function generateQuestionText(input: InputData): string {
  const name = input.name

  // For booleans, phrase as a yes/no question
  if (input.typeRef === 'boolean') {
    // If it already looks like a question or statement, just add "?"
    if (/^(is|has|are|do|does|can|meets|lives|registered)/i.test(name)) {
      return `${name}?`
    }
    // Otherwise, phrase it as "Are you..." or "Do you..."
    return `${name}?`
  }

  // For numbers and other types, ask for the value
  return `What is your ${name.toLowerCase()}?`
}
