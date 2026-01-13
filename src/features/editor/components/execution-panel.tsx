import { useState, useCallback, useEffect } from 'react'
import { useDMNStore } from '../../../store/dmn-store'
import {
  executeModel,
  formatValue,
  type ExecutionResult,
} from '../../../lib/feel-engine'
import { Input } from '../../../components/ui/input'
import { Label } from '../../../components/ui/label'
import { Button } from '../../../components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../../../components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../../components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../../components/ui/dropdown-menu'
import {
  Play,
  RotateCcw,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eraser,
  FlaskConical,
  MoreHorizontal,
} from 'lucide-react'
import { cn } from '../../../lib/utils'

// Simple hash function for comparing inputs
function hashInputs(inputs: Record<string, unknown>): string {
  return JSON.stringify(inputs, Object.keys(inputs).sort())
}

export function ExecutionPanel() {
  const {
    model,
    executionContext,
    setExecutionContext,
    setIsExecuting,
    pendingExecuteInputs,
    setPendingExecuteInputs,
    pendingRun,
    setPendingRun,
    addTestCase,
    setActiveLeftTab,
    select,
    centerOnNode,
  } = useDMNStore()
  const [inputValues, setInputValues] = useState<Record<string, unknown>>({})
  const [lastResult, setLastResult] = useState<ExecutionResult | null>(null)
  const [showCreateTestDialog, setShowCreateTestDialog] = useState(false)
  const [newTestName, setNewTestName] = useState('New Test from Execute')

  // Initialize input values from model
  const initializeInputs = useCallback(() => {
    const initial: Record<string, unknown> = {}
    model.inputs.forEach((input) => {
      switch (input.typeRef) {
        case 'number':
          initial[input.id] = 0
          break
        case 'boolean':
          initial[input.id] = false
          break
        case 'string':
          initial[input.id] = ''
          break
        default:
          initial[input.id] = null
      }
    })
    setInputValues(initial)
  }, [model.inputs])

  // Auto-initialize when model inputs change
  useEffect(() => {
    initializeInputs()
  }, [initializeInputs])

  // Load pending inputs from test cases panel
  useEffect(() => {
    if (pendingExecuteInputs) {
      setInputValues(pendingExecuteInputs)
      setPendingExecuteInputs(null)
    }
  }, [pendingExecuteInputs, setPendingExecuteInputs])

  // Open dialog to create a test case
  const openCreateTestDialog = useCallback(() => {
    setNewTestName('New Test from Execute')
    setShowCreateTestDialog(true)
  }, [])

  // Create a test case from current inputs and results
  const createTestFromInputs = useCallback(() => {
    addTestCase({
      name: newTestName,
      inputs: { ...inputValues },
      expectations: lastResult
        ? Object.values(lastResult.decisions)
            .filter((dr) => !dr.error)
            .map((dr) => ({
              nodeId: dr.decisionId,
              nodeName: dr.decisionName,
              expectedValue: dr.value,
            }))
        : [],
    })
    setShowCreateTestDialog(false)
    setActiveLeftTab('tests')
  }, [inputValues, lastResult, newTestName, addTestCase, setActiveLeftTab])

  // Update a single input value
  const updateInputValue = (inputId: string, value: unknown) => {
    setInputValues((prev) => ({
      ...prev,
      [inputId]: value,
    }))
  }

  // Execute the model
  const runExecution = useCallback(() => {
    setIsExecuting(true)

    try {
      // Normalize input values (convert empty strings to 0 for numbers)
      const normalizedInputs: Record<string, unknown> = {}
      model.inputs.forEach((input) => {
        const value = inputValues[input.id]
        if (input.typeRef === 'number' && value === '') {
          normalizedInputs[input.id] = 0
        } else {
          normalizedInputs[input.id] = value
        }
      })

      const result = executeModel(model, normalizedInputs)
      setLastResult(result)

      // Convert to ExecutionContext format for the store
      const context = {
        inputs: normalizedInputs,
        results: Object.fromEntries(
          Object.entries(result.decisions).map(([id, dr]) => [
            id,
            {
              value: dr.value,
              success: !dr.error,
              error: dr.error,
              timestamp: Date.now(),
            },
          ])
        ),
      }

      setExecutionContext(context, 'execute', hashInputs(normalizedInputs))
    } finally {
      setIsExecuting(false)
    }
  }, [model, inputValues, setIsExecuting, setExecutionContext])

  // Handle pending run from toolbar
  useEffect(() => {
    if (pendingRun) {
      setPendingRun(false)
      runExecution()
    }
  }, [pendingRun, setPendingRun, runExecution])

  // Clear execution results
  const clearExecution = () => {
    setLastResult(null)
    setExecutionContext(null)
  }

  // Render input field based on type
  const renderInputField = (input: (typeof model.inputs)[0]) => {
    const value = inputValues[input.id]

    switch (input.typeRef) {
      case 'boolean':
        return (
          <Select
            value={value === true ? 'true' : 'false'}
            onValueChange={(v) => updateInputValue(input.id, v === 'true')}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">true</SelectItem>
              <SelectItem value="false">false</SelectItem>
            </SelectContent>
          </Select>
        )

      case 'number':
        return (
          <Input
            type="number"
            value={value === '' ? '' : (value as number)}
            onChange={(e) => {
              const val = e.target.value
              // Allow empty string while typing, store as empty or parsed number
              updateInputValue(input.id, val === '' ? '' : parseFloat(val))
            }}
            className="font-mono"
          />
        )

      case 'string':
      default:
        return (
          <Input
            type="text"
            value={String(value ?? '')}
            onChange={(e) => updateInputValue(input.id, e.target.value)}
          />
        )
    }
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-3 border-b flex items-center justify-between">
        <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
          Execute
        </h2>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={clearExecution}
            disabled={!executionContext}
            title="Clear results from graph"
          >
            <Eraser className="h-4 w-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={initializeInputs}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset Inputs
              </DropdownMenuItem>
              <DropdownMenuItem onClick={openCreateTestDialog}>
                <FlaskConical className="h-4 w-4 mr-2" />
                Create Test Case
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button size="sm" onClick={runExecution} className="gap-1">
            <Play className="h-4 w-4" />
            Run
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Input Values */}
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm">Input Values</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {model.inputs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No inputs defined</p>
            ) : (
              model.inputs.map((input) => (
                <div key={input.id} className="space-y-1">
                  <Label
                    className="text-xs flex items-center gap-2 cursor-pointer hover:text-blue-600"
                    onClick={() => {
                      select('input', input.id)
                      centerOnNode(input.id)
                    }}
                  >
                    {input.name}
                    <span className="text-muted-foreground">
                      ({input.typeRef})
                    </span>
                  </Label>
                  {renderInputField(input)}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Execution Results */}
        {lastResult && (
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm flex items-center gap-2">
                Results
                {lastResult.success ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-amber-500" />
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {Object.values(lastResult.decisions).map((result) => (
                <div
                  key={result.decisionId}
                  className={cn(
                    'flex items-center justify-between py-1 px-2 rounded text-sm cursor-pointer',
                    result.error
                      ? 'bg-red-50 hover:bg-red-100'
                      : 'bg-gray-50 hover:bg-gray-100'
                  )}
                  onClick={() => {
                    select('decision', result.decisionId)
                    centerOnNode(result.decisionId)
                  }}
                >
                  <span className="font-medium truncate hover:text-green-600">
                    {result.decisionName}
                  </span>
                  {result.error ? (
                    <span className="text-red-500 flex items-center gap-1">
                      <XCircle className="h-3 w-3" />
                      Error
                    </span>
                  ) : (
                    <span className="font-mono text-green-700">
                      {formatValue(result.value)}
                    </span>
                  )}
                </div>
              ))}

              {lastResult.errors.length > 0 && (
                <div className="mt-3 pt-3 border-t">
                  <Label className="text-xs text-red-500">Errors</Label>
                  <div className="mt-1 space-y-1">
                    {lastResult.errors.map((err, i) => (
                      <p key={i} className="text-xs text-red-600 font-mono">
                        {err}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Create Test Dialog */}
      <Dialog
        open={showCreateTestDialog}
        onOpenChange={setShowCreateTestDialog}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Test Case</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="test-name">Test Name</Label>
              <Input
                id="test-name"
                value={newTestName}
                onChange={(e) => setNewTestName(e.target.value)}
                placeholder="Enter test case name"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newTestName.trim()) {
                    createTestFromInputs()
                  }
                }}
                autoFocus
              />
            </div>
            {lastResult && (
              <p className="text-sm text-muted-foreground">
                This will create a test with{' '}
                {
                  Object.values(lastResult.decisions).filter((d) => !d.error)
                    .length
                }{' '}
                expected outputs from the last execution.
              </p>
            )}
            {!lastResult && (
              <p className="text-sm text-muted-foreground">
                No execution results yet. The test will be created with inputs
                only (no expectations).
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateTestDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={createTestFromInputs}
              disabled={!newTestName.trim()}
            >
              Create Test
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
