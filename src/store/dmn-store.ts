import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import {
  type DMNModel,
  type InputData,
  type Decision,
  type BusinessKnowledgeModel,
  type ExecutionContext,
  type ExtractedConstant,
  createDMNModel,
  createInputData,
  createDecision,
  createBKM,
  generateId,
} from '../types/dmn'

// Selection state
export type SelectionType = 'input' | 'decision' | 'bkm' | null

export interface Selection {
  type: SelectionType
  id: string | null
}

// Editor state
interface EditorState {
  // The DMN model
  model: DMNModel

  // UI state
  selection: Selection
  isDirty: boolean

  // Constants extracted from the model
  constants: ExtractedConstant[]

  // Execution state (for future engine integration)
  executionContext: ExecutionContext | null
  isExecuting: boolean

  // Actions - Model management
  setModel: (model: DMNModel) => void
  newModel: () => void
  updateModelInfo: (
    updates: Partial<Pick<DMNModel, 'name' | 'namespace' | 'description'>>
  ) => void

  // Actions - Inputs
  addInput: (input?: Partial<InputData>) => InputData
  updateInput: (id: string, updates: Partial<InputData>) => void
  deleteInput: (id: string) => void

  // Actions - Decisions
  addDecision: (decision?: Partial<Decision>) => Decision
  updateDecision: (id: string, updates: Partial<Decision>) => void
  deleteDecision: (id: string) => void
  addDecisionDependency: (
    decisionId: string,
    dependencyId: string,
    type: 'input' | 'decision'
  ) => void
  removeDecisionDependency: (decisionId: string, requirementId: string) => void
  addDecisionKnowledgeRequirement: (decisionId: string, bkmId: string) => void
  removeDecisionKnowledgeRequirement: (
    decisionId: string,
    requirementId: string
  ) => void

  // Actions - BKMs
  addBKM: (bkm?: Partial<BusinessKnowledgeModel>) => BusinessKnowledgeModel
  updateBKM: (id: string, updates: Partial<BusinessKnowledgeModel>) => void
  deleteBKM: (id: string) => void

  // Actions - Selection
  select: (type: SelectionType, id: string | null) => void
  clearSelection: () => void

  // Actions - Constants
  setConstants: (constants: ExtractedConstant[]) => void
  updateConstant: (id: string, updates: Partial<ExtractedConstant>) => void

  // Actions - Execution
  setExecutionContext: (context: ExecutionContext | null) => void
  setIsExecuting: (isExecuting: boolean) => void

  // Utility
  markClean: () => void
}

export const useDMNStore = create<EditorState>()(
  immer((set) => ({
    // Initial state
    model: createDMNModel(),
    selection: { type: null, id: null },
    isDirty: false,
    constants: [],
    executionContext: null,
    isExecuting: false,

    // Model management
    setModel: (model) =>
      set((state) => {
        state.model = model
        state.isDirty = false
        state.selection = { type: null, id: null }
      }),

    newModel: () =>
      set((state) => {
        state.model = createDMNModel()
        state.isDirty = false
        state.selection = { type: null, id: null }
        state.constants = []
        state.executionContext = null
      }),

    updateModelInfo: (updates) =>
      set((state) => {
        Object.assign(state.model, updates)
        state.isDirty = true
      }),

    // Inputs
    addInput: (partial) => {
      const input = createInputData(partial)
      set((state) => {
        state.model.inputs.push(input)
        state.isDirty = true
        state.selection = { type: 'input', id: input.id }
      })
      return input
    },

    updateInput: (id, updates) =>
      set((state) => {
        const index = state.model.inputs.findIndex((i) => i.id === id)
        if (index !== -1) {
          Object.assign(state.model.inputs[index], updates)
          state.isDirty = true
        }
      }),

    deleteInput: (id) =>
      set((state) => {
        state.model.inputs = state.model.inputs.filter((i) => i.id !== id)
        // Also remove any references to this input in decisions
        state.model.decisions.forEach((d) => {
          d.informationRequirements = d.informationRequirements.filter(
            (r) => r.href !== id
          )
        })
        state.isDirty = true
        if (state.selection.id === id) {
          state.selection = { type: null, id: null }
        }
      }),

    // Decisions
    addDecision: (partial) => {
      const decision = createDecision(partial)
      set((state) => {
        state.model.decisions.push(decision)
        state.isDirty = true
        state.selection = { type: 'decision', id: decision.id }
      })
      return decision
    },

    updateDecision: (id, updates) =>
      set((state) => {
        const index = state.model.decisions.findIndex((d) => d.id === id)
        if (index !== -1) {
          const decision = state.model.decisions[index]
          Object.assign(decision, updates)
          // Keep variable name in sync with decision name
          if (updates.name) {
            decision.variable.name = updates.name
          }
          state.isDirty = true
        }
      }),

    deleteDecision: (id) =>
      set((state) => {
        state.model.decisions = state.model.decisions.filter((d) => d.id !== id)
        // Also remove any references to this decision in other decisions
        state.model.decisions.forEach((d) => {
          d.informationRequirements = d.informationRequirements.filter(
            (r) => r.href !== id
          )
        })
        state.isDirty = true
        if (state.selection.id === id) {
          state.selection = { type: null, id: null }
        }
      }),

    addDecisionDependency: (decisionId, dependencyId, type) =>
      set((state) => {
        const decision = state.model.decisions.find((d) => d.id === decisionId)
        if (decision) {
          // Check if dependency already exists
          const exists = decision.informationRequirements.some(
            (r) => r.href === dependencyId
          )
          if (!exists) {
            decision.informationRequirements.push({
              id: generateId(),
              type,
              href: dependencyId,
            })
            state.isDirty = true
          }
        }
      }),

    removeDecisionDependency: (decisionId, requirementId) =>
      set((state) => {
        const decision = state.model.decisions.find((d) => d.id === decisionId)
        if (decision) {
          decision.informationRequirements =
            decision.informationRequirements.filter(
              (r) => r.id !== requirementId
            )
          state.isDirty = true
        }
      }),

    addDecisionKnowledgeRequirement: (decisionId, bkmId) =>
      set((state) => {
        const decision = state.model.decisions.find((d) => d.id === decisionId)
        if (decision) {
          const exists = decision.knowledgeRequirements.some(
            (r) => r.href === bkmId
          )
          if (!exists) {
            decision.knowledgeRequirements.push({
              id: generateId(),
              href: bkmId,
            })
            state.isDirty = true
          }
        }
      }),

    removeDecisionKnowledgeRequirement: (decisionId, requirementId) =>
      set((state) => {
        const decision = state.model.decisions.find((d) => d.id === decisionId)
        if (decision) {
          decision.knowledgeRequirements =
            decision.knowledgeRequirements.filter((r) => r.id !== requirementId)
          state.isDirty = true
        }
      }),

    // BKMs
    addBKM: (partial) => {
      const bkm = createBKM(partial)
      set((state) => {
        state.model.businessKnowledgeModels.push(bkm)
        state.isDirty = true
        state.selection = { type: 'bkm', id: bkm.id }
      })
      return bkm
    },

    updateBKM: (id, updates) =>
      set((state) => {
        const index = state.model.businessKnowledgeModels.findIndex(
          (b) => b.id === id
        )
        if (index !== -1) {
          const bkm = state.model.businessKnowledgeModels[index]
          Object.assign(bkm, updates)
          // Keep variable name in sync
          if (updates.name) {
            bkm.variable.name = updates.name
          }
          state.isDirty = true
        }
      }),

    deleteBKM: (id) =>
      set((state) => {
        state.model.businessKnowledgeModels =
          state.model.businessKnowledgeModels.filter((b) => b.id !== id)
        // Also remove any references to this BKM in decisions
        state.model.decisions.forEach((d) => {
          d.knowledgeRequirements = d.knowledgeRequirements.filter(
            (r) => r.href !== id
          )
        })
        state.isDirty = true
        if (state.selection.id === id) {
          state.selection = { type: null, id: null }
        }
      }),

    // Selection
    select: (type, id) =>
      set((state) => {
        state.selection = { type, id }
      }),

    clearSelection: () =>
      set((state) => {
        state.selection = { type: null, id: null }
      }),

    // Constants
    setConstants: (constants) =>
      set((state) => {
        state.constants = constants
      }),

    updateConstant: (id, updates) =>
      set((state) => {
        const index = state.constants.findIndex((c) => c.id === id)
        if (index !== -1) {
          Object.assign(state.constants[index], updates)
        }
      }),

    // Execution
    setExecutionContext: (context) =>
      set((state) => {
        state.executionContext = context
      }),

    setIsExecuting: (isExecuting) =>
      set((state) => {
        state.isExecuting = isExecuting
      }),

    // Utility
    markClean: () =>
      set((state) => {
        state.isDirty = false
      }),
  }))
)

// Selectors for derived state
export const useSelectedElement = () => {
  const { model, selection } = useDMNStore()

  if (!selection.id) return null

  switch (selection.type) {
    case 'input':
      return model.inputs.find((i) => i.id === selection.id) ?? null
    case 'decision':
      return model.decisions.find((d) => d.id === selection.id) ?? null
    case 'bkm':
      return (
        model.businessKnowledgeModels.find((b) => b.id === selection.id) ?? null
      )
    default:
      return null
  }
}

// Get all dependencies for a decision (flattened)
export const useDecisionDependencies = (decisionId: string) => {
  const { model } = useDMNStore()
  const decision = model.decisions.find((d) => d.id === decisionId)

  if (!decision) return { inputs: [], decisions: [], bkms: [] }

  const inputDeps = decision.informationRequirements
    .filter((r) => r.type === 'input')
    .map((r) => model.inputs.find((i) => i.id === r.href))
    .filter(Boolean) as InputData[]

  const decisionDeps = decision.informationRequirements
    .filter((r) => r.type === 'decision')
    .map((r) => model.decisions.find((d) => d.id === r.href))
    .filter(Boolean) as Decision[]

  const bkmDeps = decision.knowledgeRequirements
    .map((r) => model.businessKnowledgeModels.find((b) => b.id === r.href))
    .filter(Boolean) as BusinessKnowledgeModel[]

  return { inputs: inputDeps, decisions: decisionDeps, bkms: bkmDeps }
}
