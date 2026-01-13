import { useCallback, useEffect, useMemo, useState, useRef } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider,
  type Node,
  type Edge,
  type NodeTypes,
  MarkerType,
  Position,
  Handle,
  Panel,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import ELK from 'elkjs/lib/elk.bundled.js'
import { useDMNStore, useConstantReferences } from '../../../store/dmn-store'
import {
  Database,
  GitBranch,
  BookOpen,
  ChevronDown,
  ChevronRight,
  Maximize2,
  Minimize2,
  LayoutGrid,
} from 'lucide-react'
import { cn } from '../../../lib/utils'
import { Button } from '../../../components/ui/button'
import { formatValue } from '../../../lib/feel-engine'
import type {
  InputData,
  Decision,
  BusinessKnowledgeModel,
  ExecutionContext,
} from '../../../types/dmn'

// Custom node component for Input Data
function InputNode({
  data,
  selected,
}: {
  data: {
    label: string
    typeRef: string
    element: InputData
    highlighted?: boolean
    onHover?: (id: string | null) => void
    executionValue?: unknown
  }
  selected: boolean
}) {
  const { select } = useDMNStore()
  const hasValue = data.executionValue !== undefined

  return (
    <div
      className={cn(
        'px-4 py-3 rounded-lg border-2 bg-white shadow-sm min-w-[150px]',
        selected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-blue-300',
        data.highlighted && !selected && 'ring-2 ring-amber-400 ring-offset-2'
      )}
      onClick={() => select('input', data.element.id)}
      onMouseEnter={() => data.onHover?.(data.element.id)}
      onMouseLeave={() => data.onHover?.(null)}
    >
      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-blue-500"
      />
      <div className="flex items-center gap-2">
        <Database className="h-4 w-4 text-blue-500" />
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm">{data.label}</div>
          <div className="text-xs text-muted-foreground">{data.typeRef}</div>
        </div>
      </div>
      {hasValue && (
        <div className="mt-2 pt-2 border-t border-blue-200">
          <div className="text-xs font-mono text-blue-700 bg-blue-50 px-2 py-1 rounded truncate">
            {formatValue(data.executionValue)}
          </div>
        </div>
      )}
    </div>
  )
}

// Custom node component for Decision
function DecisionNode({
  data,
  selected,
}: {
  data: {
    label: string
    typeRef: string
    element: Decision
    highlighted?: boolean
    isCollapsed?: boolean
    hasHiddenDeps?: boolean
    onToggleCollapse?: () => void
    onHover?: (id: string | null) => void
    executionValue?: unknown
    executionError?: string
    expectedValue?: unknown
    testPassed?: boolean
  }
  selected: boolean
}) {
  const { select } = useDMNStore()
  const hasResult =
    data.executionValue !== undefined || data.executionError !== undefined
  const isTestResult = data.testPassed !== undefined
  const hasExpectation = isTestResult && data.expectedValue !== undefined

  // Determine border color based on test result
  const getBorderClass = () => {
    if (data.executionError) return 'border-red-400'
    if (isTestResult) {
      return data.testPassed ? 'border-green-500' : 'border-red-400'
    }
    return selected ? 'border-green-500' : 'border-green-300'
  }

  return (
    <div
      className={cn(
        'px-4 py-3 rounded-lg border-2 bg-white shadow-sm min-w-[150px] relative',
        getBorderClass(),
        selected && 'ring-2 ring-green-200',
        data.highlighted && !selected && 'ring-2 ring-amber-400 ring-offset-2'
      )}
      onClick={() => select('decision', data.element.id)}
      onMouseEnter={() => data.onHover?.(data.element.id)}
      onMouseLeave={() => data.onHover?.(null)}
    >
      <Handle type="target" position={Position.Top} className="!bg-green-500" />
      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-green-500"
      />
      <div className="flex items-center gap-2">
        {data.hasHiddenDeps && (
          <button
            className="p-0.5 hover:bg-gray-100 rounded"
            onClick={(e) => {
              e.stopPropagation()
              data.onToggleCollapse?.()
            }}
          >
            {data.isCollapsed ? (
              <ChevronRight className="h-4 w-4 text-gray-500" />
            ) : (
              <ChevronDown className="h-4 w-4 text-gray-500" />
            )}
          </button>
        )}
        <GitBranch
          className={cn(
            'h-4 w-4',
            isTestResult
              ? data.testPassed
                ? 'text-green-500'
                : 'text-red-500'
              : 'text-green-500'
          )}
        />
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm">{data.label}</div>
          <div className="text-xs text-muted-foreground">{data.typeRef}</div>
        </div>
      </div>
      {hasResult && (
        <div
          className={cn(
            'mt-2 pt-2 border-t',
            data.executionError
              ? 'border-red-200'
              : isTestResult
                ? data.testPassed
                  ? 'border-green-200'
                  : 'border-red-200'
                : 'border-green-200'
          )}
        >
          {data.executionError ? (
            <div className="text-xs font-mono text-red-600 bg-red-50 px-2 py-1 rounded truncate">
              Error
            </div>
          ) : hasExpectation ? (
            <div className="space-y-1">
              <div className="text-xs">
                <span className="text-muted-foreground">Expected: </span>
                <span className="font-mono text-green-700">
                  {formatValue(data.expectedValue)}
                </span>
              </div>
              <div className="text-xs">
                <span className="text-muted-foreground">Actual: </span>
                <span
                  className={cn(
                    'font-mono',
                    data.testPassed ? 'text-green-700' : 'text-red-600'
                  )}
                >
                  {formatValue(data.executionValue)}
                </span>
              </div>
            </div>
          ) : (
            <div className="text-xs font-mono text-green-700 bg-green-50 px-2 py-1 rounded truncate">
              {formatValue(data.executionValue)}
            </div>
          )}
        </div>
      )}
      {data.isCollapsed && data.hasHiddenDeps && (
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-gray-500 text-white text-xs px-1.5 py-0.5 rounded-full">
          ...
        </div>
      )}
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
    highlighted?: boolean
    onHover?: (id: string | null) => void
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
          : 'border-purple-300',
        data.highlighted && !selected && 'ring-2 ring-amber-400 ring-offset-2'
      )}
      onClick={() => select('bkm', data.element.id)}
      onMouseEnter={() => data.onHover?.(data.element.id)}
      onMouseLeave={() => data.onHover?.(null)}
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

// Node dimensions for layout calculation
const NODE_WIDTH = 180
const NODE_HEIGHT = 60

// Calculate which nodes should be visible based on collapsed state
function getVisibleElements(
  inputs: InputData[],
  decisions: Decision[],
  bkms: BusinessKnowledgeModel[],
  collapsedNodes: Set<string>
): {
  visibleInputs: InputData[]
  visibleDecisions: Decision[]
  visibleBkms: BusinessKnowledgeModel[]
  hiddenDeps: Map<string, Set<string>> // Map of node ID to its hidden dependency IDs
} {
  // Track hidden dependencies for each collapsed node
  const hiddenDeps = new Map<string, Set<string>>()

  // For each collapsed decision, mark its dependencies as potentially hidden
  const potentiallyHidden = new Set<string>()

  collapsedNodes.forEach((collapsedId) => {
    const decision = decisions.find((d) => d.id === collapsedId)
    if (!decision) return

    const deps = new Set<string>()

    // Get all upstream dependencies recursively
    const getUpstreamDeps = (decId: string, visited: Set<string>) => {
      if (visited.has(decId)) return
      visited.add(decId)

      const dec = decisions.find((d) => d.id === decId)
      if (!dec) return

      dec.informationRequirements.forEach((req) => {
        deps.add(req.href)
        potentiallyHidden.add(req.href)
        if (req.type === 'decision') {
          getUpstreamDeps(req.href, visited)
        }
      })
      dec.knowledgeRequirements.forEach((req) => {
        deps.add(req.href)
        potentiallyHidden.add(req.href)
      })
    }

    getUpstreamDeps(collapsedId, new Set())
    hiddenDeps.set(collapsedId, deps)
  })

  // Now determine which potentially hidden nodes are actually hidden
  // A node is hidden only if ALL paths to it go through collapsed nodes
  const actuallyVisible = new Set<string>()

  // Find terminal decisions (those not depended on by others)
  const dependedOn = new Set<string>()
  decisions.forEach((d) => {
    d.informationRequirements
      .filter((r) => r.type === 'decision')
      .forEach((r) => dependedOn.add(r.href))
  })

  const terminalDecisions = decisions.filter((d) => !dependedOn.has(d.id))

  // Walk from terminal decisions and mark visible nodes
  const markVisible = (
    nodeId: string,
    nodeType: 'decision' | 'input' | 'bkm',
    fromCollapsed: boolean
  ) => {
    if (fromCollapsed) return // Don't traverse past collapsed nodes

    actuallyVisible.add(nodeId)

    if (nodeType === 'decision') {
      const dec = decisions.find((d) => d.id === nodeId)
      if (!dec) return

      const isCollapsed = collapsedNodes.has(nodeId)

      dec.informationRequirements.forEach((req) => {
        markVisible(req.href, req.type, isCollapsed)
      })
      dec.knowledgeRequirements.forEach((req) => {
        markVisible(req.href, 'bkm', isCollapsed)
      })
    }
  }

  terminalDecisions.forEach((d) => {
    markVisible(d.id, 'decision', false)
  })

  // Filter to only visible elements
  const visibleInputs = inputs.filter((i) => actuallyVisible.has(i.id))
  const visibleDecisions = decisions.filter((d) => actuallyVisible.has(d.id))
  const visibleBkms = bkms.filter((b) => actuallyVisible.has(b.id))

  return { visibleInputs, visibleDecisions, visibleBkms, hiddenDeps }
}

// Create ELK instance
const elk = new ELK()

// Use ELK for automatic hierarchical layout with better edge routing
async function layoutNodesAsync(
  inputs: InputData[],
  decisions: Decision[],
  bkms: BusinessKnowledgeModel[],
  collapsedNodes: Set<string>,
  toggleCollapse: (id: string) => void,
  onHover: (id: string | null) => void,
  executionContext: ExecutionContext | null
): Promise<{ nodes: Node[]; edges: Edge[] }> {
  const { visibleInputs, visibleDecisions, visibleBkms } = getVisibleElements(
    inputs,
    decisions,
    bkms,
    collapsedNodes
  )

  const nodes: Node[] = []
  const edges: Edge[] = []
  const visibleIds = new Set([
    ...visibleInputs.map((i) => i.id),
    ...visibleDecisions.map((d) => d.id),
    ...visibleBkms.map((b) => b.id),
  ])

  // Build ELK graph structure
  const elkNodes: {
    id: string
    width: number
    height: number
    layoutOptions?: Record<string, string>
  }[] = []
  const elkEdges: { id: string; sources: string[]; targets: string[] }[] = []

  // Add input nodes
  visibleInputs.forEach((input) => {
    // Get execution value for this input
    const executionValue = executionContext?.inputs[input.id]

    elkNodes.push({
      id: input.id,
      width: NODE_WIDTH,
      height: executionValue !== undefined ? NODE_HEIGHT + 30 : NODE_HEIGHT,
    })
    nodes.push({
      id: input.id,
      type: 'input',
      position: { x: 0, y: 0 },
      data: {
        label: input.name,
        typeRef: input.typeRef,
        element: input,
        onHover,
        executionValue,
      },
    })
  })

  // Add BKM nodes
  visibleBkms.forEach((bkm) => {
    elkNodes.push({ id: bkm.id, width: NODE_WIDTH + 40, height: NODE_HEIGHT })
    nodes.push({
      id: bkm.id,
      type: 'bkm',
      position: { x: 0, y: 0 },
      data: {
        label: bkm.name,
        typeRef: bkm.variable.typeRef,
        params: bkm.parameters.map((p) => p.name),
        element: bkm,
        onHover,
      },
    })
  })

  // Add decision nodes and their edges
  visibleDecisions.forEach((decision) => {
    const isCollapsed = collapsedNodes.has(decision.id)
    const hasHiddenDeps =
      decision.informationRequirements.length > 0 ||
      decision.knowledgeRequirements.length > 0

    // Get execution result for this decision
    const executionResult = executionContext?.results[decision.id]
    const hasExecutionResult = executionResult !== undefined

    elkNodes.push({
      id: decision.id,
      width: NODE_WIDTH,
      height: hasExecutionResult ? NODE_HEIGHT + 30 : NODE_HEIGHT,
    })
    nodes.push({
      id: decision.id,
      type: 'decision',
      position: { x: 0, y: 0 },
      data: {
        label: decision.name,
        typeRef: decision.variable.typeRef,
        element: decision,
        isCollapsed,
        hasHiddenDeps,
        onToggleCollapse: () => toggleCollapse(decision.id),
        onHover,
        executionValue: executionResult?.value,
        executionError: executionResult?.error,
      },
    })

    // Add edges only to visible nodes
    decision.informationRequirements.forEach((req) => {
      if (!visibleIds.has(req.href)) return

      const edgeId = `${req.href}-${decision.id}`
      elkEdges.push({
        id: edgeId,
        sources: [req.href],
        targets: [decision.id],
      })
      edges.push({
        id: edgeId,
        source: req.href,
        target: decision.id,
        type: 'default',
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

    // Add edges for knowledge requirements (dashed)
    decision.knowledgeRequirements.forEach((req) => {
      if (!visibleIds.has(req.href)) return

      const edgeId = `${req.href}-${decision.id}-bkm`
      elkEdges.push({
        id: edgeId,
        sources: [req.href],
        targets: [decision.id],
      })
      edges.push({
        id: edgeId,
        source: req.href,
        target: decision.id,
        type: 'default',
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

  // Run ELK layout
  const elkGraph = {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': 'DOWN',
      'elk.spacing.nodeNode': '60',
      'elk.spacing.edgeNode': '40',
      'elk.layered.spacing.nodeNodeBetweenLayers': '100',
      'elk.layered.spacing.edgeNodeBetweenLayers': '40',
      'elk.layered.layering.strategy': 'LONGEST_PATH_SOURCE',
      'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
      'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
      'elk.edgeRouting': 'SPLINES',
      'elk.layered.mergeEdges': 'true',
    },
    children: elkNodes,
    edges: elkEdges,
  }

  const layoutedGraph = await elk.layout(elkGraph)

  // Update node positions from ELK results
  layoutedGraph.children?.forEach((elkNode) => {
    const node = nodes.find((n) => n.id === elkNode.id)
    if (node && elkNode.x !== undefined && elkNode.y !== undefined) {
      node.position = {
        x: elkNode.x,
        y: elkNode.y,
      }
    }
  })

  return { nodes, edges }
}

// Inner component that uses useReactFlow (must be inside ReactFlowProvider)
function GraphViewInner() {
  const {
    model,
    selection,
    collapsedNodes,
    toggleNodeCollapsed,
    expandAllNodes,
    collapseAllNodes,
    executionContext,
    executionSource,
    executionTestCaseName,
    pendingCenterNodeId,
    clearPendingCenter,
  } = useDMNStore()
  const { setCenter, getZoom } = useReactFlow()

  // Track hovered node for edge highlighting
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null)

  // Track which node was just toggled for centering
  const lastToggledNodeRef = useRef<string | null>(null)

  // Store execution context in ref so we can access it during layout without it being a dependency
  const executionContextRef = useRef(executionContext)
  executionContextRef.current = executionContext

  // Get selected constant name for highlighting
  const selectedConstantName = useMemo(() => {
    if (selection.type !== 'constant' || !selection.id) return null
    const constant = model.constants.find((c) => c.id === selection.id)
    return constant?.name ?? null
  }, [selection.type, selection.id, model.constants])

  // Get IDs of elements that reference the selected constant
  const highlightedIds = useConstantReferences(selectedConstantName)

  // Handle hover callback
  const handleHover = useCallback((id: string | null) => {
    setHoveredNodeId(id)
  }, [])

  // Handle toggle collapse with centering
  const handleToggleCollapse = useCallback(
    (nodeId: string) => {
      lastToggledNodeRef.current = nodeId
      toggleNodeCollapsed(nodeId)
    },
    [toggleNodeCollapsed]
  )

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])

  // Track if we need to run layout (for manual relayout button)
  const [layoutTrigger, setLayoutTrigger] = useState(0)

  // Manual relayout function
  const triggerRelayout = useCallback(() => {
    setLayoutTrigger((prev) => prev + 1)
  }, [])

  // Update layout only when model structure or collapsed state changes (NOT on execution)
  useEffect(() => {
    let cancelled = false

    layoutNodesAsync(
      model.inputs,
      model.decisions,
      model.businessKnowledgeModels,
      collapsedNodes,
      handleToggleCollapse,
      handleHover,
      null // Don't use execution context for layout - values are overlaid separately
    ).then(({ nodes: newNodes, edges: newEdges }) => {
      if (cancelled) return

      // Apply execution values to the new nodes if we have them (use ref to avoid dependency)
      const currentExecution = executionContextRef.current
      const nodesWithExecution = currentExecution
        ? newNodes.map((node) => {
            if (node.type === 'input') {
              return {
                ...node,
                data: {
                  ...node.data,
                  executionValue: currentExecution.inputs[node.id],
                },
              }
            } else if (node.type === 'decision') {
              const result = currentExecution.results[node.id]
              return {
                ...node,
                data: {
                  ...node.data,
                  executionValue: result?.value,
                  executionError: result?.error,
                  expectedValue: result?.expectedValue,
                  testPassed: result?.passed,
                },
              }
            }
            return node
          })
        : newNodes

      setNodes(nodesWithExecution)
      setEdges(newEdges)

      // Center on the toggled node after layout updates
      if (lastToggledNodeRef.current) {
        const toggledNode = nodesWithExecution.find(
          (n) => n.id === lastToggledNodeRef.current
        )
        if (toggledNode) {
          // Use setTimeout to ensure the layout has been applied
          setTimeout(() => {
            const zoom = getZoom()
            setCenter(
              toggledNode.position.x + NODE_WIDTH / 2,
              toggledNode.position.y + NODE_HEIGHT / 2,
              { zoom, duration: 300 }
            )
            lastToggledNodeRef.current = null
          }, 50)
        }
      }
    })

    return () => {
      cancelled = true
    }
  }, [
    model.inputs,
    model.decisions,
    model.businessKnowledgeModels,
    collapsedNodes,
    handleToggleCollapse,
    handleHover,
    layoutTrigger, // Only relayout when this changes (manual trigger)
    setNodes,
    setEdges,
    setCenter,
    getZoom,
  ])

  // Update execution values on nodes WITHOUT changing positions
  useEffect(() => {
    if (!executionContext) {
      // Clear execution values from all nodes
      setNodes((nds) =>
        nds.map((node) => ({
          ...node,
          data: {
            ...node.data,
            executionValue: undefined,
            executionError: undefined,
            expectedValue: undefined,
            testPassed: undefined,
          },
        }))
      )
      return
    }

    setNodes((nds) =>
      nds.map((node) => {
        if (node.type === 'input') {
          return {
            ...node,
            data: {
              ...node.data,
              executionValue: executionContext.inputs[node.id],
            },
          }
        } else if (node.type === 'decision') {
          const result = executionContext.results[node.id]
          return {
            ...node,
            data: {
              ...node.data,
              executionValue: result?.value,
              executionError: result?.error,
              expectedValue: result?.expectedValue,
              testPassed: result?.passed,
            },
          }
        }
        return node
      })
    )
  }, [executionContext, setNodes])

  // Update selection and highlighting state on nodes
  useEffect(() => {
    setNodes((nds) =>
      nds.map((node) => ({
        ...node,
        selected: node.id === selection.id,
        data: {
          ...node.data,
          highlighted: highlightedIds.has(node.id),
        },
      }))
    )
  }, [selection.id, highlightedIds, setNodes])

  // Update edge styles based on hovered node
  useEffect(() => {
    if (!hoveredNodeId) {
      // Reset all edges to full opacity
      setEdges((eds) =>
        eds.map((edge) => ({
          ...edge,
          style: {
            ...edge.style,
            opacity: 1,
          },
          animated: false,
        }))
      )
    } else {
      // Dim edges not connected to hovered node, highlight connected ones
      setEdges((eds) =>
        eds.map((edge) => {
          const isConnected =
            edge.source === hoveredNodeId || edge.target === hoveredNodeId
          return {
            ...edge,
            style: {
              ...edge.style,
              opacity: isConnected ? 1 : 0.15,
              strokeWidth: isConnected ? 3 : 2,
            },
            animated: isConnected,
          }
        })
      )
    }
  }, [hoveredNodeId, setEdges])

  // Center on node when requested from outside (e.g., from Execute panel or Model Explorer)
  useEffect(() => {
    if (!pendingCenterNodeId) return

    const node = nodes.find((n) => n.id === pendingCenterNodeId)
    if (node) {
      const zoom = getZoom()
      setCenter(
        node.position.x + NODE_WIDTH / 2,
        node.position.y + NODE_HEIGHT / 2,
        { zoom, duration: 300 }
      )
    }
    clearPendingCenter()
  }, [pendingCenterNodeId, nodes, setCenter, getZoom, clearPendingCenter])

  const onNodeClick = useCallback((_: React.MouseEvent, _node: Node) => {
    // Selection is handled in the node components
  }, [])

  const hasCollapsedNodes = collapsedNodes.size > 0

  return (
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
        type: 'default',
      }}
      proOptions={{ hideAttribution: true }}
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
      <Panel position="top-right" className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={triggerRelayout}
          className="bg-white"
          title="Recalculate node positions"
        >
          <LayoutGrid className="h-4 w-4 mr-1" />
          Relayout
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={expandAllNodes}
          disabled={!hasCollapsedNodes}
          className="bg-white"
        >
          <Maximize2 className="h-4 w-4 mr-1" />
          Expand All
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={collapseAllNodes}
          className="bg-white"
        >
          <Minimize2 className="h-4 w-4 mr-1" />
          Collapse All
        </Button>
      </Panel>
      {executionContext && (
        <Panel
          position="bottom-center"
          className="text-xs text-muted-foreground"
        >
          Showing: {executionSource === 'execute' && 'Execute panel'}
          {executionSource === 'test-builder' && 'Test Builder preview'}
          {executionSource === 'test-case' && `Test: ${executionTestCaseName}`}
        </Panel>
      )}
    </ReactFlow>
  )
}

// Wrapper component that provides ReactFlowProvider
export function GraphView() {
  return (
    <div className="h-full w-full">
      <ReactFlowProvider>
        <GraphViewInner />
      </ReactFlowProvider>
    </div>
  )
}
