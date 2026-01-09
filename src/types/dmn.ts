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

// The complete DMN Model
export interface DMNModel {
  id: string
  name: string
  namespace: string
  description?: string
  inputs: InputData[]
  decisions: Decision[]
  businessKnowledgeModels: BusinessKnowledgeModel[]
}

// Extracted constant from expressions (for the constants editor)
export interface ExtractedConstant {
  id: string
  name: string
  value: string | number | boolean
  type: DMNDataType
  description?: string
  category?: string
  usedIn: string[] // IDs of decisions/BKMs that use this constant
}

// Constants collection
export interface ConstantsCollection {
  constants: ExtractedConstant[]
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
export function isDecision(
  element: InputData | Decision | BusinessKnowledgeModel
): element is Decision {
  return 'informationRequirements' in element
}

export function isBKM(
  element: InputData | Decision | BusinessKnowledgeModel
): element is BusinessKnowledgeModel {
  return 'parameters' in element
}

export function isInputData(
  element: InputData | Decision | BusinessKnowledgeModel
): element is InputData {
  return !isDecision(element) && !isBKM(element)
}

// Create default/empty instances
export function createInputData(partial?: Partial<InputData>): InputData {
  return {
    id: crypto.randomUUID(),
    name: 'New Input',
    typeRef: 'string',
    ...partial,
  }
}

export function createDecision(partial?: Partial<Decision>): Decision {
  return {
    id: crypto.randomUUID(),
    name: 'New Decision',
    variable: {
      name: 'New Decision',
      typeRef: 'string',
    },
    informationRequirements: [],
    knowledgeRequirements: [],
    expression: {
      id: crypto.randomUUID(),
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
    id: crypto.randomUUID(),
    name: 'New Business Knowledge Model',
    variable: {
      name: 'New Business Knowledge Model',
      typeRef: 'any',
    },
    parameters: [],
    expression: {
      id: crypto.randomUUID(),
      text: '',
      typeRef: 'any',
    },
    expressionType: 'literal',
    ...partial,
  }
}

export function createDMNModel(partial?: Partial<DMNModel>): DMNModel {
  return {
    id: crypto.randomUUID(),
    name: 'New DMN Model',
    namespace: 'https://example.org/dmn',
    inputs: [],
    decisions: [],
    businessKnowledgeModels: [],
    ...partial,
  }
}
