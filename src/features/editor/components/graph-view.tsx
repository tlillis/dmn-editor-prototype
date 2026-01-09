import { useCallback, useEffect, useMemo } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type NodeTypes,
  MarkerType,
  Position,
  Handle,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useDMNStore } from '../../../store/dmn-store'
import { Database, GitBranch, BookOpen } from 'lucide-react'
import { cn } from '../../../lib/utils'
import type {
  InputData,
  Decision,
  BusinessKnowledgeModel,
} from '../../../types/dmn'

// Custom node component for Input Data
function InputNode({
  data,
  selected,
}: {
  data: { label: string; typeRef: string; element: InputData }
  selected: boolean
}) {
  const { select } = useDMNStore()

  return (
    <div
      className={cn(
        'px-4 py-3 rounded-lg border-2 bg-white shadow-sm min-w-[150px]',
        selected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-blue-300'
      )}
      onClick={() => select('input', data.element.id)}
    >
      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-blue-500"
      />
      <div className="flex items-center gap-2">
        <Database className="h-4 w-4 text-blue-500" />
        <div>
          <div className="font-medium text-sm">{data.label}</div>
          <div className="text-xs text-muted-foreground">{data.typeRef}</div>
        </div>
      </div>
    </div>
  )
}

// Custom node component for Decision
function DecisionNode({
  data,
  selected,
}: {
  data: { label: string; typeRef: string; element: Decision }
  selected: boolean
}) {
  const { select } = useDMNStore()

  return (
    <div
      className={cn(
        'px-4 py-3 rounded-lg border-2 bg-white shadow-sm min-w-[150px]',
        selected ? 'border-green-500 ring-2 ring-green-200' : 'border-green-300'
      )}
      onClick={() => select('decision', data.element.id)}
    >
      <Handle type="target" position={Position.Top} className="!bg-green-500" />
      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-green-500"
      />
      <div className="flex items-center gap-2">
        <GitBranch className="h-4 w-4 text-green-500" />
        <div>
          <div className="font-medium text-sm">{data.label}</div>
          <div className="text-xs text-muted-foreground">{data.typeRef}</div>
        </div>
      </div>
    </div>
  )
}

// Custom node component for BKM
function BKMNode({
  data,
  selected,
}: {
  data: {
    label: string
    typeRef: string
    params: string[]
    element: BusinessKnowledgeModel
  }
  selected: boolean
}) {
  const { select } = useDMNStore()

  return (
    <div
      className={cn(
        'px-4 py-3 rounded-lg border-2 bg-white shadow-sm min-w-[150px]',
        selected
          ? 'border-purple-500 ring-2 ring-purple-200'
          : 'border-purple-300'
      )}
      onClick={() => select('bkm', data.element.id)}
    >
      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-purple-500"
      />
      <div className="flex items-center gap-2">
        <BookOpen className="h-4 w-4 text-purple-500" />
        <div>
          <div className="font-medium text-sm">{data.label}</div>
          <div className="text-xs text-muted-foreground">
            ({data.params.join(', ')}) → {data.typeRef}
          </div>
        </div>
      </div>
    </div>
  )
}

const nodeTypes: NodeTypes = {
  input: InputNode,
  decision: DecisionNode,
  bkm: BKMNode,
}

// Simple layout algorithm using topological sort
function layoutNodes(
  inputs: InputData[],
  decisions: Decision[],
  bkms: BusinessKnowledgeModel[]
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = []
  const edges: Edge[] = []

  const HORIZONTAL_SPACING = 200
  const VERTICAL_SPACING = 120

  // Position inputs at the top
  inputs.forEach((input, i) => {
    nodes.push({
      id: input.id,
      type: 'input',
      position: { x: i * HORIZONTAL_SPACING, y: 0 },
      data: {
        label: input.name,
        typeRef: input.typeRef,
        element: input,
      },
    })
  })

  // Position BKMs in a separate column on the right
  bkms.forEach((bkm, i) => {
    nodes.push({
      id: bkm.id,
      type: 'bkm',
      position: {
        x: (inputs.length + 1) * HORIZONTAL_SPACING,
        y: i * VERTICAL_SPACING,
      },
      data: {
        label: bkm.name,
        typeRef: bkm.variable.typeRef,
        params: bkm.parameters.map((p) => p.name),
        element: bkm,
      },
    })
  })

  // Build dependency graph for decisions
  const decisionMap = new Map(decisions.map((d) => [d.id, d]))
  const levels = new Map<string, number>()

  // Calculate level for each decision based on dependencies
  function getLevel(decisionId: string, visited = new Set<string>()): number {
    if (visited.has(decisionId)) return 0 // Cycle detection
    visited.add(decisionId)

    if (levels.has(decisionId)) return levels.get(decisionId)!

    const decision = decisionMap.get(decisionId)
    if (!decision) return 0

    let maxLevel = 0
    for (const req of decision.informationRequirements) {
      if (req.type === 'decision') {
        maxLevel = Math.max(maxLevel, getLevel(req.href, visited) + 1)
      }
    }

    levels.set(decisionId, maxLevel)
    return maxLevel
  }

  // Calculate levels for all decisions
  decisions.forEach((d) => getLevel(d.id))

  // Group decisions by level
  const levelGroups = new Map<number, Decision[]>()
  decisions.forEach((d) => {
    const level = levels.get(d.id) ?? 0
    if (!levelGroups.has(level)) {
      levelGroups.set(level, [])
    }
    levelGroups.get(level)!.push(d)
  })

  // Position decisions by level
  const sortedLevels = Array.from(levelGroups.keys()).sort((a, b) => a - b)
  sortedLevels.forEach((level) => {
    const decisionsAtLevel = levelGroups.get(level)!
    decisionsAtLevel.forEach((decision, i) => {
      nodes.push({
        id: decision.id,
        type: 'decision',
        position: {
          x: i * HORIZONTAL_SPACING,
          y: (level + 1) * VERTICAL_SPACING,
        },
        data: {
          label: decision.name,
          typeRef: decision.variable.typeRef,
          element: decision,
        },
      })

      // Create edges for information requirements
      decision.informationRequirements.forEach((req) => {
        edges.push({
          id: `${req.href}-${decision.id}`,
          source: req.href,
          target: decision.id,
          type: 'smoothstep',
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 15,
            height: 15,
          },
          style: {
            stroke: req.type === 'input' ? '#3b82f6' : '#22c55e',
            strokeWidth: 2,
          },
        })
      })

      // Create edges for knowledge requirements (dashed)
      decision.knowledgeRequirements.forEach((req) => {
        edges.push({
          id: `${req.href}-${decision.id}-bkm`,
          source: req.href,
          target: decision.id,
          type: 'smoothstep',
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 15,
            height: 15,
          },
          style: {
            stroke: '#a855f7',
            strokeWidth: 2,
            strokeDasharray: '5,5',
          },
        })
      })
    })
  })

  return { nodes, edges }
}

export function GraphView() {
  const { model, selection } = useDMNStore()

  // Memoize the layout calculation
  const { initialNodes, initialEdges } = useMemo(() => {
    const { nodes, edges } = layoutNodes(
      model.inputs,
      model.decisions,
      model.businessKnowledgeModels
    )
    return { initialNodes: nodes, initialEdges: edges }
  }, [model.inputs, model.decisions, model.businessKnowledgeModels])

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

  // Update nodes when model changes
  useEffect(() => {
    const { nodes: newNodes, edges: newEdges } = layoutNodes(
      model.inputs,
      model.decisions,
      model.businessKnowledgeModels
    )
    setNodes(newNodes)
    setEdges(newEdges)
  }, [
    model.inputs,
    model.decisions,
    model.businessKnowledgeModels,
    setNodes,
    setEdges,
  ])

  // Update selection state on nodes
  useEffect(() => {
    setNodes((nds) =>
      nds.map((node) => ({
        ...node,
        selected: node.id === selection.id,
      }))
    )
  }, [selection.id, setNodes])

  const onNodeClick = useCallback((_: React.MouseEvent, _node: Node) => {
    // Selection is handled in the node components
  }, [])

  return (
    <div className="h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.1}
        maxZoom={2}
        panOnScroll
        selectionOnDrag
        defaultEdgeOptions={{
          type: 'smoothstep',
        }}
      >
        <Background color="#e5e7eb" gap={16} />
        <Controls />
        <MiniMap
          nodeColor={(node) => {
            switch (node.type) {
              case 'input':
                return '#3b82f6'
              case 'decision':
                return '#22c55e'
              case 'bkm':
                return '#a855f7'
              default:
                return '#6b7280'
            }
          }}
          maskColor="rgba(0, 0, 0, 0.1)"
        />
      </ReactFlow>
    </div>
  )
}
