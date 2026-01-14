export type {
  DMNEngine,
  ExecutionResult,
  DecisionResult,
  EngineId,
  EngineConfig,
} from './types'
export { feelinEngine } from './feelin-engine'
export {
  ExtendedServicesEngine,
  extendedServicesEngine,
  DEFAULT_EXTENDED_SERVICES_CONFIG,
  type ExtendedServicesConfig,
} from './extended-services-engine'

import type { DMNEngine, EngineId } from './types'
import { feelinEngine } from './feelin-engine'
import { extendedServicesEngine } from './extended-services-engine'

// Registry of all available engines
export const engines: Record<EngineId, DMNEngine> = {
  feelin: feelinEngine,
  'extended-services': extendedServicesEngine,
}

// Get engine by ID
export function getEngine(id: EngineId): DMNEngine {
  const engine = engines[id]
  if (!engine) {
    throw new Error(`Unknown engine: ${id}`)
  }
  return engine
}

// Get all available engines
export function getAllEngines(): DMNEngine[] {
  return Object.values(engines)
}
