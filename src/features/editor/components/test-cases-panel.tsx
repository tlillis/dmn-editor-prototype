import { useState, useCallback } from 'react'
import { useDMNStore } from '../../../store/dmn-store'
import { formatValue } from '../../../lib/feel-engine'
import { getEngine } from '../../../lib/engines'
import { Input } from '../../../components/ui/input'
import { Label } from '../../../components/ui/label'
import { Button } from '../../../components/ui/button'
import { Textarea } from '../../../components/ui/textarea'
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
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '../../../components/ui/accordion'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../../components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../../../components/ui/dialog'
import {
  Play,
  Plus,
  Trash2,
  Copy,
  CheckCircle,
  XCircle,
  AlertCircle,
  Camera,
  Pencil,
  Download,
  Upload,
  MoreHorizontal,
  Send,
  Eye,
  RotateCcw,
} from 'lucide-react'
import { cn } from '../../../lib/utils'
import type {
  TestCase,
  TestExpectation,
  TestCaseResult,
  TestExpectationResult,
} from '../../../types/dmn'
import { exportToTck } from '../utils/tck-export'
import { importFromTck } from '../utils/tck-import'

// Simple hash function for comparing inputs
function hashInputs(inputs: Record<string, unknown>): string {
  return JSON.stringify(inputs, Object.keys(inputs).sort())
}

type ViewMode = 'list' | 'builder'

export function TestCasesPanel() {
  const {
    model,
    addTestCase,
    updateTestCase,
    deleteTestCase,
    duplicateTestCase,
    testResults,
    isRunningTests,
    setTestResult,
    clearTestResults,
    setIsRunningTests,
    setExecutionContext,
    setIsExecuting,
    executionTestCaseId,
    setPendingExecuteInputs,
    setActiveLeftTab,
    select,
    centerOnNode,
    selectedEngineId,
  } = useDMNStore()

  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [editingTestId, setEditingTestId] = useState<string | null>(null)
  const [builderInputs, setBuilderInputs] = useState<Record<string, unknown>>(
    {}
  )
  const [builderExpectations, setBuilderExpectations] = useState<
    TestExpectation[]
  >([])
  const [builderName, setBuilderName] = useState('')
  const [builderDescription, setBuilderDescription] = useState('')
  const [editingExpIndex, setEditingExpIndex] = useState<number | null>(null)
  const [editingExpValue, setEditingExpValue] = useState<string>('')
  const [newExpNodeId, setNewExpNodeId] = useState<string>('')
  const [newExpValue, setNewExpValue] = useState<string>('')
  const [showSendToExecuteDialog, setShowSendToExecuteDialog] = useState(false)
  const [pendingSendInputs, setPendingSendInputs] = useState<Record<
    string,
    unknown
  > | null>(null)

  // Send inputs to execute panel with confirmation
  const confirmSendToExecute = useCallback(() => {
    if (pendingSendInputs) {
      setPendingExecuteInputs(pendingSendInputs)
      setActiveLeftTab('execute')
      setShowSendToExecuteDialog(false)
      setPendingSendInputs(null)
    }
  }, [pendingSendInputs, setPendingExecuteInputs, setActiveLeftTab])

  const openSendToExecuteDialog = useCallback(
    (inputs: Record<string, unknown>) => {
      setPendingSendInputs(inputs)
      setShowSendToExecuteDialog(true)
    },
    []
  )

  // Export test cases to TCK XML
  const handleExportTck = useCallback(() => {
    if (model.testCases.length === 0) {
      alert('No test cases to export')
      return
    }
    const xml = exportToTck(model)
    const blob = new Blob([xml], { type: 'application/xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${model.name.replace(/\s+/g, '_')}_tests.xml`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [model])

  // Import test cases from TCK XML
  const handleImportTck = useCallback(() => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.xml'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      const text = await file.text()
      const result = importFromTck(text, model)

      // Show warnings/errors if any
      if (result.errors.length > 0) {
        alert(`Import errors:\n${result.errors.join('\n')}`)
        return
      }

      if (result.warnings.length > 0) {
        console.warn('TCK Import warnings:', result.warnings)
      }

      // Add imported test cases
      result.testCases.forEach((tc) => {
        addTestCase(tc)
      })

      if (result.testCases.length > 0) {
        const warningText =
          result.warnings.length > 0
            ? `\n\nWarnings:\n${result.warnings.join('\n')}`
            : ''
        alert(`Imported ${result.testCases.length} test case(s)${warningText}`)
      }
    }
    input.click()
  }, [model, addTestCase])

  // Initialize builder with current input defaults
  const initializeBuilder = useCallback(
    (testCase?: TestCase) => {
      if (testCase) {
        setBuilderName(testCase.name)
        setBuilderDescription(testCase.description || '')
        setBuilderInputs({ ...testCase.inputs })
        setBuilderExpectations([...testCase.expectations])
        setEditingTestId(testCase.id)
      } else {
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
        setBuilderName('New Test Case')
        setBuilderDescription('')
        setBuilderInputs(initial)
        setBuilderExpectations([])
        setEditingTestId(null)
      }
      setViewMode('builder')
    },
    [model.inputs]
  )

  // Run test case and capture outputs
  const captureOutputs = useCallback(async () => {
    const normalizedInputs: Record<string, unknown> = {}
    model.inputs.forEach((input) => {
      const value = builderInputs[input.id]
      if (input.typeRef === 'number' && value === '') {
        normalizedInputs[input.id] = 0
      } else {
        normalizedInputs[input.id] = value
      }
    })

    const engine = getEngine(selectedEngineId)
    const result = await engine.evaluate(model, normalizedInputs)

    // Create expectations from successful decision outputs
    const newExpectations: TestExpectation[] = []
    Object.values(result.decisions).forEach((dr) => {
      if (!dr.error) {
        newExpectations.push({
          nodeId: dr.decisionId,
          nodeName: dr.decisionName,
          expectedValue: dr.value,
        })
      }
    })

    setBuilderExpectations(newExpectations)
  }, [model, builderInputs, selectedEngineId])

  // Preview execution - run model and show results on graph nodes
  const previewExecution = useCallback(async () => {
    setIsExecuting(true)

    try {
      const normalizedInputs: Record<string, unknown> = {}
      model.inputs.forEach((input) => {
        const value = builderInputs[input.id]
        if (input.typeRef === 'number' && value === '') {
          normalizedInputs[input.id] = 0
        } else {
          normalizedInputs[input.id] = value
        }
      })

      const engine = getEngine(selectedEngineId)
      const result = await engine.evaluate(model, normalizedInputs)

      // Convert to ExecutionContext format for the store (same as Execute panel)
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

      setExecutionContext(context, 'test-builder', hashInputs(normalizedInputs))
    } finally {
      setIsExecuting(false)
    }
  }, [
    model,
    builderInputs,
    setExecutionContext,
    setIsExecuting,
    selectedEngineId,
  ])

  // Save test case from builder
  const saveTestCase = useCallback(() => {
    if (editingTestId) {
      updateTestCase(editingTestId, {
        name: builderName,
        description: builderDescription || undefined,
        inputs: builderInputs,
        expectations: builderExpectations,
      })
    } else {
      addTestCase({
        name: builderName,
        description: builderDescription || undefined,
        inputs: builderInputs,
        expectations: builderExpectations,
      })
    }
    setViewMode('list')
    setEditingTestId(null)
  }, [
    editingTestId,
    builderName,
    builderDescription,
    builderInputs,
    builderExpectations,
    addTestCase,
    updateTestCase,
  ])

  // Run a single test case (optionally show results on graph)
  const runTestCase = useCallback(
    async (testCase: TestCase, showOnGraph: boolean = true) => {
      const startTime = Date.now()

      // Normalize inputs
      const normalizedInputs: Record<string, unknown> = {}
      model.inputs.forEach((input) => {
        const value = testCase.inputs[input.id]
        if (
          input.typeRef === 'number' &&
          (value === '' || value === undefined)
        ) {
          normalizedInputs[input.id] = 0
        } else {
          normalizedInputs[input.id] = value ?? getDefaultValue(input.typeRef)
        }
      })

      const engine = getEngine(selectedEngineId)
      const result = await engine.evaluate(model, normalizedInputs)

      // Build expectations map for quick lookup
      const expectationsMap = new Map(
        testCase.expectations.map((exp) => [exp.nodeId, exp])
      )

      // Check expectations
      const expectationResults: TestExpectationResult[] =
        testCase.expectations.map((exp) => {
          const decisionResult = result.decisions[exp.nodeId]

          if (!decisionResult) {
            return {
              nodeId: exp.nodeId,
              nodeName: exp.nodeName,
              expectedValue: exp.expectedValue,
              actualValue: undefined,
              passed: false,
              error: 'Node not found in model',
            }
          }

          if (decisionResult.error) {
            return {
              nodeId: exp.nodeId,
              nodeName: exp.nodeName,
              expectedValue: exp.expectedValue,
              actualValue: undefined,
              passed: false,
              error: decisionResult.error,
            }
          }

          const passed =
            JSON.stringify(decisionResult.value) ===
            JSON.stringify(exp.expectedValue)

          return {
            nodeId: exp.nodeId,
            nodeName: exp.nodeName,
            expectedValue: exp.expectedValue,
            actualValue: decisionResult.value,
            passed,
          }
        })

      const allPassed = expectationResults.every((r) => r.passed)

      const testResult: TestCaseResult = {
        testCaseId: testCase.id,
        status: allPassed ? 'passed' : 'failed',
        expectationResults,
        executionTime: Date.now() - startTime,
        runAt: Date.now(),
      }

      setTestResult(testCase.id, testResult)

      // Show results on graph if requested
      if (showOnGraph) {
        const context = {
          inputs: normalizedInputs,
          results: Object.fromEntries(
            Object.entries(result.decisions).map(([id, dr]) => {
              const expectation = expectationsMap.get(id)
              const passed = expectation
                ? JSON.stringify(dr.value) ===
                  JSON.stringify(expectation.expectedValue)
                : undefined
              return [
                id,
                {
                  value: dr.value,
                  success: !dr.error,
                  error: dr.error,
                  timestamp: Date.now(),
                  expectedValue: expectation?.expectedValue,
                  passed,
                },
              ]
            })
          ),
        }
        setExecutionContext(
          context,
          'test-case',
          undefined,
          testCase.id,
          testCase.name
        )
      }
    },
    [model, setTestResult, setExecutionContext, selectedEngineId]
  )

  // Show existing test results on graph (without re-running)
  const showTestOnGraph = useCallback(
    async (testCase: TestCase) => {
      const testResult = testResults.get(testCase.id)
      if (!testResult) {
        // No results yet, run the test
        await runTestCase(testCase, true)
        return
      }

      // Build context from existing results
      const normalizedInputs: Record<string, unknown> = {}
      model.inputs.forEach((input) => {
        const value = testCase.inputs[input.id]
        if (
          input.typeRef === 'number' &&
          (value === '' || value === undefined)
        ) {
          normalizedInputs[input.id] = 0
        } else {
          normalizedInputs[input.id] = value ?? getDefaultValue(input.typeRef)
        }
      })

      const context = {
        inputs: normalizedInputs,
        results: Object.fromEntries(
          testResult.expectationResults.map((er) => [
            er.nodeId,
            {
              value: er.actualValue,
              success: !er.error,
              error: er.error,
              timestamp: testResult.runAt,
              expectedValue: er.expectedValue,
              passed: er.passed,
            },
          ])
        ),
      }
      setExecutionContext(
        context,
        'test-case',
        undefined,
        testCase.id,
        testCase.name
      )
    },
    [model, testResults, runTestCase, setExecutionContext]
  )

  // Run all test cases (don't update graph for batch runs)
  const runAllTests = useCallback(async () => {
    setIsRunningTests(true)
    clearTestResults()

    // Run all tests - could be parallel or sequential depending on engine
    await Promise.all(
      model.testCases.map((testCase) => runTestCase(testCase, false))
    )

    setIsRunningTests(false)
  }, [model.testCases, runTestCase, setIsRunningTests, clearTestResults])

  // Update builder input value
  const updateBuilderInput = (inputId: string, value: unknown) => {
    setBuilderInputs((prev) => ({
      ...prev,
      [inputId]: value,
    }))
  }

  // Remove an expectation
  const removeExpectation = (index: number) => {
    setBuilderExpectations((prev) => prev.filter((_, i) => i !== index))
    if (editingExpIndex === index) {
      setEditingExpIndex(null)
    }
  }

  // Update an expectation's expected value
  const updateExpectationValue = (index: number, value: unknown) => {
    setBuilderExpectations((prev) =>
      prev.map((exp, i) =>
        i === index ? { ...exp, expectedValue: value } : exp
      )
    )
  }

  // Parse a string value to the appropriate type
  const parseExpectedValue = (valueStr: string): unknown => {
    const trimmed = valueStr.trim()
    // Try to parse as JSON first (handles numbers, booleans, arrays, objects)
    try {
      return JSON.parse(trimmed)
    } catch {
      // If not valid JSON, treat as string
      return trimmed
    }
  }

  // Add a new expectation manually
  const addManualExpectation = () => {
    if (!newExpNodeId) return
    const decision = model.decisions.find((d) => d.id === newExpNodeId)
    if (!decision) return

    // Check if expectation for this node already exists
    const existingIndex = builderExpectations.findIndex(
      (e) => e.nodeId === newExpNodeId
    )
    if (existingIndex >= 0) {
      // Update existing instead of adding duplicate
      updateExpectationValue(existingIndex, parseExpectedValue(newExpValue))
    } else {
      setBuilderExpectations((prev) => [
        ...prev,
        {
          nodeId: decision.id,
          nodeName: decision.name,
          expectedValue: parseExpectedValue(newExpValue),
        },
      ])
    }
    setNewExpNodeId('')
    setNewExpValue('')
  }

  // Render input field for builder
  const renderBuilderInputField = (input: (typeof model.inputs)[0]) => {
    const value = builderInputs[input.id]

    switch (input.typeRef) {
      case 'boolean':
        return (
          <Select
            value={value === true ? 'true' : 'false'}
            onValueChange={(v) => updateBuilderInput(input.id, v === 'true')}
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
              updateBuilderInput(input.id, val === '' ? '' : parseFloat(val))
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
            onChange={(e) => updateBuilderInput(input.id, e.target.value)}
          />
        )
    }
  }

  // Get test result status icon
  const getStatusIcon = (result?: TestCaseResult) => {
    if (!result) return null

    switch (result.status) {
      case 'passed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'running':
        return <AlertCircle className="h-4 w-4 text-yellow-500 animate-pulse" />
      default:
        return null
    }
  }

  // Summary stats
  const passedCount = Array.from(testResults.values()).filter(
    (r) => r.status === 'passed'
  ).length
  const failedCount = Array.from(testResults.values()).filter(
    (r) => r.status === 'failed'
  ).length

  if (viewMode === 'builder') {
    return (
      <div className="h-full flex flex-col">
        <div className="p-3 border-b flex items-center justify-between">
          <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
            {editingTestId ? 'Edit Test Case' : 'New Test Case'}
          </h2>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode('list')}
            >
              Cancel
            </Button>
            <Button size="sm" onClick={saveTestCase}>
              Save
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Test Case Name */}
          <div className="space-y-1">
            <Label className="text-xs">Name</Label>
            <Input
              value={builderName}
              onChange={(e) => setBuilderName(e.target.value)}
              placeholder="Test case name"
            />
          </div>

          {/* Description */}
          <div className="space-y-1">
            <Label className="text-xs">Description (optional)</Label>
            <Textarea
              value={builderDescription}
              onChange={(e) => setBuilderDescription(e.target.value)}
              placeholder="Describe what this test case validates..."
              rows={2}
            />
          </div>

          {/* Input Values */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm">Input Values</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {model.inputs.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No inputs defined
                </p>
              ) : (
                model.inputs.map((input) => (
                  <div key={input.id} className="space-y-1">
                    <Label className="text-xs flex items-center gap-2">
                      {input.name}
                      <span className="text-muted-foreground">
                        ({input.typeRef})
                      </span>
                    </Label>
                    {renderBuilderInputField(input)}
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Preview and Capture Buttons */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1 gap-2"
              onClick={previewExecution}
            >
              <Play className="h-4 w-4" />
              Preview
            </Button>
            <Button
              variant="outline"
              className="flex-1 gap-2"
              onClick={captureOutputs}
            >
              <Camera className="h-4 w-4" />
              Capture
            </Button>
          </div>

          {/* Expected Outputs */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm flex items-center justify-between">
                Expected Outputs
                <span className="text-xs text-muted-foreground font-normal">
                  {builderExpectations.length} expectations
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Existing expectations */}
              {builderExpectations.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Add expectations manually or use "Capture" to auto-fill from
                  execution
                </p>
              ) : (
                <div className="space-y-2">
                  {builderExpectations.map((exp, index) => (
                    <div
                      key={`${exp.nodeId}-${index}`}
                      className="py-2 px-2 rounded bg-gray-50 text-sm"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium truncate">
                          {exp.nodeName}
                        </span>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => {
                              if (editingExpIndex === index) {
                                setEditingExpIndex(null)
                                setEditingExpValue('')
                              } else {
                                setEditingExpIndex(index)
                                setEditingExpValue(
                                  JSON.stringify(exp.expectedValue)
                                )
                              }
                            }}
                            title="Edit value"
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => removeExpectation(index)}
                            title="Remove"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      {editingExpIndex === index ? (
                        <Input
                          className="font-mono text-xs"
                          value={editingExpValue}
                          onChange={(e) => setEditingExpValue(e.target.value)}
                          onBlur={() => {
                            updateExpectationValue(
                              index,
                              parseExpectedValue(editingExpValue)
                            )
                            setEditingExpIndex(null)
                            setEditingExpValue('')
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              updateExpectationValue(
                                index,
                                parseExpectedValue(editingExpValue)
                              )
                              setEditingExpIndex(null)
                              setEditingExpValue('')
                            } else if (e.key === 'Escape') {
                              setEditingExpIndex(null)
                              setEditingExpValue('')
                            }
                          }}
                          autoFocus
                        />
                      ) : (
                        <span
                          className="font-mono text-xs text-green-700 cursor-pointer hover:underline"
                          onClick={() => {
                            setEditingExpIndex(index)
                            setEditingExpValue(
                              JSON.stringify(exp.expectedValue)
                            )
                          }}
                        >
                          {formatValue(exp.expectedValue)}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Add new expectation manually */}
              {model.decisions.length > 0 && (
                <div className="pt-2 border-t space-y-2">
                  <Label className="text-xs text-muted-foreground">
                    Add Expectation
                  </Label>
                  <Select value={newExpNodeId} onValueChange={setNewExpNodeId}>
                    <SelectTrigger className="text-sm">
                      <SelectValue placeholder="Select decision..." />
                    </SelectTrigger>
                    <SelectContent>
                      {model.decisions.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.name}
                          {builderExpectations.some((e) => e.nodeId === d.id) &&
                            ' (update)'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {newExpNodeId && (
                    <div className="flex gap-2">
                      <Input
                        className="font-mono text-sm flex-1"
                        placeholder="Expected value (JSON)"
                        value={newExpValue}
                        onChange={(e) => setNewExpValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') addManualExpectation()
                        }}
                      />
                      <Button size="sm" onClick={addManualExpectation}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // List view
  return (
    <div className="h-full flex flex-col">
      <div className="p-3 border-b flex items-center justify-between">
        <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
          Test Cases
        </h2>
        <div className="flex gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" title="More options">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleImportTck}>
                <Upload className="h-4 w-4 mr-2" />
                Import TCK
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleExportTck}
                disabled={model.testCases.length === 0}
              >
                <Download className="h-4 w-4 mr-2" />
                Export TCK
              </DropdownMenuItem>
              {testResults.size > 0 && (
                <DropdownMenuItem onClick={clearTestResults}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Clear Test Results
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => initializeBuilder()}
            title="New test case"
          >
            <Plus className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            onClick={runAllTests}
            disabled={model.testCases.length === 0 || isRunningTests}
            className="gap-1"
          >
            <Play className="h-4 w-4" />
            Run All
          </Button>
        </div>
      </div>

      {/* Summary */}
      {testResults.size > 0 && (
        <div className="px-4 py-2 border-b bg-muted/50 flex items-center gap-4 text-sm">
          <span className="text-muted-foreground">Results:</span>
          <span className="flex items-center gap-1 text-green-600">
            <CheckCircle className="h-3 w-3" />
            {passedCount} passed
          </span>
          <span className="flex items-center gap-1 text-red-600">
            <XCircle className="h-3 w-3" />
            {failedCount} failed
          </span>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {model.testCases.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">
            <p className="text-sm">No test cases yet</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => initializeBuilder()}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Test Case
            </Button>
          </div>
        ) : (
          <Accordion type="multiple" className="w-full">
            {model.testCases.map((testCase) => {
              const result = testResults.get(testCase.id)

              return (
                <AccordionItem key={testCase.id} value={testCase.id}>
                  <AccordionTrigger className="px-4 py-2 hover:no-underline">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="w-4 shrink-0 flex items-center justify-center">
                        {getStatusIcon(result)}
                      </span>
                      <span className="truncate font-medium text-left max-w-[160px]">
                        {testCase.name}
                      </span>
                      <span
                        className="text-xs text-muted-foreground shrink-0 ml-auto"
                        title={`${testCase.expectations.length} expected output${testCase.expectations.length !== 1 ? 's' : ''} to verify`}
                      >
                        {testCase.expectations.length} exp
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="px-4 pb-3 space-y-3">
                      {testCase.description && (
                        <p className="text-xs text-muted-foreground">
                          {testCase.description}
                        </p>
                      )}

                      {/* Test Actions */}
                      <div className="flex gap-1 items-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => runTestCase(testCase)}
                        >
                          <Play className="h-3 w-3 mr-1" />
                          Run
                        </Button>
                        {result && (
                          <Button
                            variant={
                              executionTestCaseId === testCase.id
                                ? 'secondary'
                                : 'outline'
                            }
                            size="sm"
                            onClick={() => showTestOnGraph(testCase)}
                            title={
                              executionTestCaseId === testCase.id
                                ? 'Currently shown on graph'
                                : 'View results on graph'
                            }
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            {executionTestCaseId === testCase.id
                              ? 'Viewing'
                              : 'View'}
                          </Button>
                        )}
                        <div className="flex gap-1 ml-auto">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => initializeBuilder(testCase)}
                            title="Edit test case"
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-3 w-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => duplicateTestCase(testCase.id)}
                              >
                                <Copy className="h-3 w-3 mr-2" />
                                Duplicate
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  openSendToExecuteDialog(testCase.inputs)
                                }
                              >
                                <Send className="h-3 w-3 mr-2" />
                                Send to Execute
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => deleteTestCase(testCase.id)}
                                className="text-red-600"
                              >
                                <Trash2 className="h-3 w-3 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>

                      {/* Results */}
                      {result && (
                        <div className="space-y-1 pt-2 border-t">
                          <Label className="text-xs text-muted-foreground">
                            Results ({result.executionTime}ms)
                          </Label>
                          {result.expectationResults.map((expResult, i) => (
                            <div
                              key={`${expResult.nodeId}-${i}`}
                              className={cn(
                                'flex items-start gap-2 py-1.5 px-2 rounded text-xs cursor-pointer',
                                expResult.passed
                                  ? 'bg-green-50 hover:bg-green-100'
                                  : 'bg-red-50 hover:bg-red-100'
                              )}
                              onClick={() => {
                                select('decision', expResult.nodeId)
                                centerOnNode(expResult.nodeId)
                              }}
                            >
                              {expResult.passed ? (
                                <CheckCircle className="h-3 w-3 text-green-500 mt-0.5" />
                              ) : (
                                <XCircle className="h-3 w-3 text-red-500 mt-0.5" />
                              )}
                              <div className="flex-1 min-w-0">
                                <span className="font-medium block">
                                  {expResult.nodeName}
                                </span>
                                {expResult.error ? (
                                  <span className="text-red-600">
                                    {expResult.error}
                                  </span>
                                ) : !expResult.passed ? (
                                  <div className="space-y-0.5">
                                    <div>
                                      <span className="text-muted-foreground">
                                        Expected:{' '}
                                      </span>
                                      <span className="font-mono text-green-700">
                                        {formatValue(expResult.expectedValue)}
                                      </span>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">
                                        Actual:{' '}
                                      </span>
                                      <span className="font-mono text-red-700">
                                        {formatValue(expResult.actualValue)}
                                      </span>
                                    </div>
                                  </div>
                                ) : (
                                  <span className="font-mono text-green-700">
                                    {formatValue(expResult.expectedValue)}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )
            })}
          </Accordion>
        )}
      </div>

      {/* Send to Execute Confirmation Dialog */}
      <Dialog
        open={showSendToExecuteDialog}
        onOpenChange={setShowSendToExecuteDialog}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Send to Execute</DialogTitle>
            <DialogDescription>
              This will replace the current input values in the Execute panel
              with the test case inputs.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowSendToExecuteDialog(false)}
            >
              Cancel
            </Button>
            <Button onClick={confirmSendToExecute}>Replace Inputs</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Helper to get default value for a type
function getDefaultValue(typeRef: string): unknown {
  switch (typeRef) {
    case 'number':
      return 0
    case 'boolean':
      return false
    case 'string':
      return ''
    default:
      return null
  }
}
