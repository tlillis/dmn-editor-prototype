import { useMemo } from 'react'
import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { enableMapSet } from 'immer'
import {
  type DMNModel,
  type InputData,
  type Decision,
  type BusinessKnowledgeModel,
  type Constant,
  type ExecutionContext,
  createDMNModel,
  createInputData,
  createDecision,
  createBKM,
  createConstant,
  generateId,
} from '../types/dmn'

// Selection state
export type SelectionType = 'input' | 'decision' | 'bkm' | 'constant' | null

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
  collapsedNodes: Set<string>

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

  // Actions - Constants
  addConstant: (constant?: Partial<Constant>) => Constant
  updateConstant: (id: string, updates: Partial<Constant>) => void
  deleteConstant: (id: string) => void

  // Actions - Selection
  select: (type: SelectionType, id: string | null) => void
  clearSelection: () => void

  // Actions - Graph collapse/expand
  toggleNodeCollapsed: (nodeId: string) => void
  expandAllNodes: () => void
  collapseAllNodes: () => void

  // Actions - Execution
  setExecutionContext: (context: ExecutionContext | null) => void
  setIsExecuting: (isExecuting: boolean) => void

  // Utility
  markClean: () => void
}

// Enable Immer MapSet plugin for Set/Map support
enableMapSet()

export const useDMNStore = create<EditorState>()(
  immer((set) => ({
    // Initial state
    model: createDMNModel(),
    selection: { type: null, id: null },
    isDirty: false,
    collapsedNodes: new Set<string>(),
    executionContext: null,
    isExecuting: false,

    // Model management
    setModel: (model) =>
      set((state) => {
        state.model = model
        state.isDirty = false
        state.selection = { type: null, id: null }
        state.collapsedNodes = new Set<string>()
      }),

    newModel: () =>
      set((state) => {
        state.model = createDMNModel()
        state.isDirty = false
        state.selection = { type: null, id: null }
        state.collapsedNodes = new Set<string>()
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

    // Graph collapse/expand
    toggleNodeCollapsed: (nodeId) =>
      set((state) => {
        const newCollapsed = new Set(state.collapsedNodes)
        if (newCollapsed.has(nodeId)) {
          newCollapsed.delete(nodeId)
        } else {
          newCollapsed.add(nodeId)
        }
        state.collapsedNodes = newCollapsed
      }),

    expandAllNodes: () =>
      set((state) => {
        state.collapsedNodes = new Set<string>()
      }),

    collapseAllNodes: () =>
      set((state) => {
        // Collapse all decisions except terminal ones (those with no dependents)
        const decisionsWithDependents = new Set<string>()
        state.model.decisions.forEach((d) => {
          d.informationRequirements
            .filter((r) => r.type === 'decision')
            .forEach((r) => decisionsWithDependents.add(r.href))
        })
        const nonTerminalDecisions = state.model.decisions
          .filter((d) => decisionsWithDependents.has(d.id))
          .map((d) => d.id)
        state.collapsedNodes = new Set(nonTerminalDecisions)
      }),

    // Constants
    addConstant: (partial) => {
      const constant = createConstant(partial)
      set((state) => {
        state.model.constants.push(constant)
        state.isDirty = true
        state.selection = { type: 'constant', id: constant.id }
      })
      return constant
    },

    updateConstant: (id, updates) =>
      set((state) => {
        const index = state.model.constants.findIndex((c) => c.id === id)
        if (index !== -1) {
          Object.assign(state.model.constants[index], updates)
          state.isDirty = true
        }
      }),

    deleteConstant: (id) =>
      set((state) => {
        state.model.constants = state.model.constants.filter((c) => c.id !== id)
        state.isDirty = true
        if (state.selection.id === id) {
          state.selection = { type: null, id: null }
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
    case 'constant':
      return model.constants.find((c) => c.id === selection.id) ?? null
    default:
      return null
  }
}

// Get all element IDs that reference a constant by name in their expressions
export const useConstantReferences = (
  constantName: string | null
): Set<string> => {
  const { model } = useDMNStore()

  return useMemo(() => {
    if (!constantName) return new Set<string>()

    const referencingIds = new Set<string>()

    // Check decisions
    model.decisions.forEach((decision) => {
      if (decision.expression.text.includes(constantName)) {
        referencingIds.add(decision.id)
      }
    })

    // Check BKMs
    model.businessKnowledgeModels.forEach((bkm) => {
      if (
        'text' in bkm.expression &&
        bkm.expression.text.includes(constantName)
      ) {
        referencingIds.add(bkm.id)
      }
    })

    return referencingIds
  }, [constantName, model.decisions, model.businessKnowledgeModels])
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
