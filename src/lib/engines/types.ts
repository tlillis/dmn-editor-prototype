import type { DMNModel } from '../../types/dmn'

// Result of evaluating a single decision
export interface DecisionResult {
  decisionId: string
  decisionName: string
  value: unknown
  error?: string
}

// Full execution result (common format for all engines)
export interface ExecutionResult {
  success: boolean
  inputs: Record<string, unknown>
  decisions: Record<string, DecisionResult>
  errors: string[]
}

// Engine interface that all engines must implement
export interface DMNEngine {
  // Unique identifier for the engine
  id: string
  // Display name for UI
  name: string
  // Description for UI
  description: string
  // Whether this engine requires external service
  requiresConnection: boolean

  // Execute the model with given inputs
  evaluate(
    model: DMNModel,
    inputs: Record<string, unknown>
  ): Promise<ExecutionResult>

  // Optional: Check if the engine is available/connected
  checkConnection?(): Promise<boolean>
}

// Engine registration
export type EngineId = 'feelin' | 'extended-services'

export interface EngineConfig {
  // For extended services
  baseUrl?: string
}
