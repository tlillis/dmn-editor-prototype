import { evaluate } from 'feelin'
import type {
  DMNModel,
  Decision,
  BusinessKnowledgeModel,
} from '../../types/dmn'
import type { DMNEngine, ExecutionResult, DecisionResult } from './types'

// Topologically sort decisions based on dependencies
function topologicalSort(decisions: Decision[]): Decision[] {
  const sorted: Decision[] = []
  const visited = new Set<string>()
  const visiting = new Set<string>()

  const decisionMap = new Map(decisions.map((d) => [d.id, d]))

  function visit(decision: Decision) {
    if (visited.has(decision.id)) return
    if (visiting.has(decision.id)) {
      throw new Error(`Circular dependency detected at: ${decision.name}`)
    }

    visiting.add(decision.id)

    // Visit decision dependencies first
    decision.informationRequirements
      .filter((r) => r.type === 'decision')
      .forEach((r) => {
        const dep = decisionMap.get(r.href)
        if (dep) visit(dep)
      })

    visiting.delete(decision.id)
    visited.add(decision.id)
    sorted.push(decision)
  }

  decisions.forEach((d) => visit(d))
  return sorted
}

// Create a function from a BKM
function createBKMFunction(
  bkm: BusinessKnowledgeModel,
  context: Record<string, unknown>
): (...args: unknown[]) => unknown {
  return (...args: unknown[]) => {
    // Create a local context with parameter bindings
    const localContext = { ...context }
    bkm.parameters.forEach((param, index) => {
      localContext[param.name] = args[index]
    })

    // Get expression text
    const expressionText = 'text' in bkm.expression ? bkm.expression.text : ''

    try {
      return evaluate(expressionText, localContext)
    } catch (e) {
      console.error(`Error evaluating BKM ${bkm.name}:`, e)
      return null
    }
  }
}

// Execute a DMN model with given inputs using feelin
function executeModelSync(
  model: DMNModel,
  inputValues: Record<string, unknown>
): ExecutionResult {
  const errors: string[] = []
  const decisionResults: Record<string, DecisionResult> = {}

  // Build initial context from inputs
  const context: Record<string, unknown> = {}

  // Add input values to context
  model.inputs.forEach((input) => {
    const value = inputValues[input.id] ?? inputValues[input.name]
    context[input.name] = value
    // Also add by ID for flexibility
    context[input.id] = value
  })

  // Add constants to context
  model.constants.forEach((constant) => {
    context[constant.name] = constant.value
  })

  // Create BKM functions and add to context
  model.businessKnowledgeModels.forEach((bkm) => {
    const fn = createBKMFunction(bkm, context)
    context[bkm.name] = fn
    // Also create a version without spaces if the name has spaces
    const noSpaceName = bkm.name.replace(/\s+/g, '')
    if (noSpaceName !== bkm.name) {
      context[noSpaceName] = fn
    }
  })

  // Sort decisions by dependency order
  let sortedDecisions: Decision[]
  try {
    sortedDecisions = topologicalSort(model.decisions)
  } catch (e) {
    return {
      success: false,
      inputs: inputValues,
      decisions: {},
      errors: [(e as Error).message],
    }
  }

  // Evaluate each decision in order
  for (const decision of sortedDecisions) {
    const expressionText = decision.expression.text

    try {
      const value = evaluate(expressionText, context)

      // Store result
      decisionResults[decision.id] = {
        decisionId: decision.id,
        decisionName: decision.name,
        value,
      }

      // Add to context for dependent decisions
      context[decision.name] = value
      context[decision.id] = value
    } catch (e) {
      const errorMsg = `Error evaluating "${decision.name}": ${(e as Error).message}`
      errors.push(errorMsg)

      decisionResults[decision.id] = {
        decisionId: decision.id,
        decisionName: decision.name,
        value: null,
        error: (e as Error).message,
      }

      // Still add null to context so dependent decisions can try to run
      context[decision.name] = null
      context[decision.id] = null
    }
  }

  return {
    success: errors.length === 0,
    inputs: inputValues,
    decisions: decisionResults,
    errors,
  }
}

// FeelinEngine implementation
export const feelinEngine: DMNEngine = {
  id: 'feelin',
  name: 'Feelin (Browser)',
  description:
    'Lightweight FEEL evaluator running in the browser. Fast but limited FEEL support.',
  requiresConnection: false,

  async evaluate(
    model: DMNModel,
    inputs: Record<string, unknown>
  ): Promise<ExecutionResult> {
    // Wrap synchronous execution in a promise
    return executeModelSync(model, inputs)
  },

  async checkConnection(): Promise<boolean> {
    // Always available - runs in browser
    return true
  },
}
