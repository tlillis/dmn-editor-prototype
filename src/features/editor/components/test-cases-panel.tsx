import { useState, useCallback } from 'react'
import { useDMNStore } from '../../../store/dmn-store'
import { executeModel, formatValue } from '../../../lib/feel-engine'
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
  Play,
  Plus,
  Trash2,
  Copy,
  CheckCircle,
  XCircle,
  AlertCircle,
  Camera,
  Eraser,
} from 'lucide-react'
import { cn } from '../../../lib/utils'
import type {
  TestCase,
  TestExpectation,
  TestCaseResult,
  TestExpectationResult,
} from '../../../types/dmn'

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
    select,
    centerOnNode,
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
  const captureOutputs = useCallback(() => {
    const normalizedInputs: Record<string, unknown> = {}
    model.inputs.forEach((input) => {
      const value = builderInputs[input.id]
      if (input.typeRef === 'number' && value === '') {
        normalizedInputs[input.id] = 0
      } else {
        normalizedInputs[input.id] = value
      }
    })

    const result = executeModel(model, normalizedInputs)

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
  }, [model, builderInputs])

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

  // Run a single test case
  const runTestCase = useCallback(
    (testCase: TestCase) => {
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

      const result = executeModel(model, normalizedInputs)

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
    },
    [model, setTestResult]
  )

  // Run all test cases
  const runAllTests = useCallback(() => {
    setIsRunningTests(true)
    clearTestResults()

    model.testCases.forEach((testCase) => {
      runTestCase(testCase)
    })

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

          {/* Capture Button */}
          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={captureOutputs}
          >
            <Camera className="h-4 w-4" />
            Capture Expected Outputs
          </Button>

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
            <CardContent className="space-y-2">
              {builderExpectations.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Click "Capture Expected Outputs" to run the model and capture
                  outputs
                </p>
              ) : (
                builderExpectations.map((exp, index) => (
                  <div
                    key={`${exp.nodeId}-${index}`}
                    className="flex items-center justify-between py-1 px-2 rounded bg-gray-50 text-sm"
                  >
                    <div className="flex-1 min-w-0">
                      <span className="font-medium truncate block">
                        {exp.nodeName}
                      </span>
                      <span className="font-mono text-xs text-green-700">
                        {formatValue(exp.expectedValue)}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => removeExpectation(index)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))
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
          {testResults.size > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearTestResults}
              title="Clear results"
            >
              <Eraser className="h-4 w-4" />
            </Button>
          )}
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
                      {getStatusIcon(result)}
                      <span className="truncate font-medium text-left">
                        {testCase.name}
                      </span>
                      <span className="text-xs text-muted-foreground ml-auto mr-2">
                        {testCase.expectations.length} expectations
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
                      <div className="flex gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => runTestCase(testCase)}
                        >
                          <Play className="h-3 w-3 mr-1" />
                          Run
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => initializeBuilder(testCase)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => duplicateTestCase(testCase.id)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteTestCase(testCase.id)}
                          className="text-red-500 hover:text-red-600"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
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
