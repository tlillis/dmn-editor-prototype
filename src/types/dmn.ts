// Core DMN Types for the editor
// Based on DMN 1.3 specification

export type DMNDataType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'date'
  | 'time'
  | 'dateTime'
  | 'context'
  | 'list'
  | 'any'

// Input Data - external data fed into the decision model
export interface InputData {
  id: string
  name: string
  description?: string
  typeRef: DMNDataType
}

// Variable definition
export interface Variable {
  name: string
  typeRef: DMNDataType
}

// Literal Expression - a FEEL expression
export interface LiteralExpression {
  id: string
  text: string
  typeRef?: DMNDataType
}

// Context Entry - key-value pair in a context
export interface ContextEntry {
  variable: Variable
  expression: LiteralExpression
}

// Context - a collection of context entries
export interface Context {
  id: string
  contextEntries: ContextEntry[]
}

// Formal Parameter for BKMs
export interface FormalParameter {
  name: string
  typeRef: DMNDataType
}

// Information Requirement - dependency on input or another decision
export interface InformationRequirement {
  id: string
  type: 'input' | 'decision'
  href: string // Reference to the required element's id
}

// Knowledge Requirement - dependency on a BKM
export interface KnowledgeRequirement {
  id: string
  href: string // Reference to the BKM's id
}

// Business Knowledge Model - reusable logic (like functions)
export interface BusinessKnowledgeModel {
  id: string
  name: string
  description?: string
  variable: Variable
  parameters: FormalParameter[]
  expression: LiteralExpression | Context
  expressionType: 'literal' | 'context'
}

// Decision - a node that produces an output based on inputs and logic
export interface Decision {
  id: string
  name: string
  description?: string
  variable: Variable
  informationRequirements: InformationRequirement[]
  knowledgeRequirements: KnowledgeRequirement[]
  expression: LiteralExpression
}

// Constant - a named value that can be referenced in expressions
export interface Constant {
  id: string
  name: string // Variable name to use in expressions (e.g., SHELTER_CAP)
  value: number | string | boolean
  type: 'number' | 'string' | 'boolean'
  description?: string
  category?: string // For grouping (e.g., "Income Limits", "Deductions")
}

// The complete DMN Model
export interface DMNModel {
  id: string
  name: string
  namespace: string
  description?: string
  inputs: InputData[]
  decisions: Decision[]
  businessKnowledgeModels: BusinessKnowledgeModel[]
  constants: Constant[]
}

// For React Flow integration
export type DMNNodeType = 'input' | 'decision' | 'bkm'

export interface DMNNodeData {
  type: DMNNodeType
  element: InputData | Decision | BusinessKnowledgeModel
  isSelected?: boolean
  executionResult?: ExecutionResult
}

// Execution result for a node (for future engine integration)
export interface ExecutionResult {
  value: unknown
  success: boolean
  error?: string
  timestamp: number
}

// Execution context - input values for running the model
export interface ExecutionContext {
  inputs: Record<string, unknown>
  results: Record<string, ExecutionResult>
}

// Helper type guards
type DMNElement = InputData | Decision | BusinessKnowledgeModel | Constant

export function isConstant(element: DMNElement): element is Constant {
  return 'type' in element && 'value' in element
}

export function isDecision(element: DMNElement): element is Decision {
  return 'informationRequirements' in element
}

export function isBKM(element: DMNElement): element is BusinessKnowledgeModel {
  return 'parameters' in element
}

export function isInputData(element: DMNElement): element is InputData {
  return !isDecision(element) && !isBKM(element) && !isConstant(element)
}

// Generate a valid NCName ID (XML NCName can't start with a digit)
export function generateId(): string {
  return `_${crypto.randomUUID()}`
}

// Create default/empty instances
export function createInputData(partial?: Partial<InputData>): InputData {
  return {
    id: generateId(),
    name: 'New Input',
    typeRef: 'string',
    ...partial,
  }
}

export function createDecision(partial?: Partial<Decision>): Decision {
  return {
    id: generateId(),
    name: 'New Decision',
    variable: {
      name: 'New Decision',
      typeRef: 'string',
    },
    informationRequirements: [],
    knowledgeRequirements: [],
    expression: {
      id: generateId(),
      text: '',
      typeRef: 'string',
    },
    ...partial,
  }
}

export function createBKM(
  partial?: Partial<BusinessKnowledgeModel>
): BusinessKnowledgeModel {
  return {
    id: generateId(),
    name: 'New Business Knowledge Model',
    variable: {
      name: 'New Business Knowledge Model',
      typeRef: 'any',
    },
    parameters: [],
    expression: {
      id: generateId(),
      text: '',
      typeRef: 'any',
    },
    expressionType: 'literal',
    ...partial,
  }
}

export function createConstant(partial?: Partial<Constant>): Constant {
  return {
    id: generateId(),
    name: 'NEW_CONSTANT',
    value: 0,
    type: 'number',
    ...partial,
  }
}

export function createDMNModel(partial?: Partial<DMNModel>): DMNModel {
  return {
    id: generateId(),
    name: 'New DMN Model',
    namespace: 'https://example.org/dmn',
    inputs: [],
    decisions: [],
    businessKnowledgeModels: [],
    constants: [],
    ...partial,
  }
}

// Validation types
export interface ValidationError {
  type: 'duplicate_name' | 'invalid_reference' | 'circular_dependency'
  message: string
  elementId?: string
  elementType?: 'input' | 'decision' | 'bkm' | 'constant'
}

// Get all element names from a model (used for duplicate detection)
export function getAllElementNames(
  model: DMNModel
): Map<string, { id: string; type: string }[]> {
  const nameMap = new Map<string, { id: string; type: string }[]>()

  const addName = (name: string, id: string, type: string) => {
    const existing = nameMap.get(name) || []
    existing.push({ id, type })
    nameMap.set(name, existing)
  }

  model.inputs.forEach((input) => addName(input.name, input.id, 'input'))
  model.decisions.forEach((decision) =>
    addName(decision.name, decision.id, 'decision')
  )
  model.businessKnowledgeModels.forEach((bkm) =>
    addName(bkm.name, bkm.id, 'bkm')
  )
  model.constants.forEach((constant) =>
    addName(constant.name, constant.id, 'constant')
  )

  return nameMap
}

// Find duplicate names in the model
export function findDuplicateNames(model: DMNModel): ValidationError[] {
  const errors: ValidationError[] = []
  const nameMap = getAllElementNames(model)

  for (const [name, elements] of nameMap) {
    if (elements.length > 1) {
      const types = elements.map((e) => e.type).join(', ')
      errors.push({
        type: 'duplicate_name',
        message: `Duplicate name "${name}" found in: ${types}`,
        elementId: elements[0].id,
        elementType: elements[0].type as ValidationError['elementType'],
      })
    }
  }

  return errors
}

// Check if a name would conflict with existing names
export function wouldNameConflict(
  model: DMNModel,
  name: string,
  excludeId?: string
): { conflicts: boolean; conflictingType?: string } {
  const nameMap = getAllElementNames(model)
  const existing = nameMap.get(name)

  if (!existing) {
    return { conflicts: false }
  }

  // If we're excluding an ID (for updates), filter it out
  const filtered = excludeId
    ? existing.filter((e) => e.id !== excludeId)
    : existing

  if (filtered.length > 0) {
    return { conflicts: true, conflictingType: filtered[0].type }
  }

  return { conflicts: false }
}
