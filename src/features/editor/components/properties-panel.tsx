import { useDMNStore, useSelectedElement } from '../../../store/dmn-store'
import {
  isDecision,
  isBKM,
  isInputData,
  generateId,
  type DMNDataType,
  type InputData,
  type Decision,
  type BusinessKnowledgeModel,
  type FormalParameter,
} from '../../../types/dmn'
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
import { Textarea } from '../../../components/ui/textarea'
import { FEELEditor } from '../../../components/feel-editor'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../../../components/ui/card'
import { Badge } from '../../../components/ui/badge'
import { Plus, X, Database, GitBranch, BookOpen } from 'lucide-react'

const DATA_TYPES: DMNDataType[] = [
  'string',
  'number',
  'boolean',
  'date',
  'time',
  'dateTime',
  'context',
  'list',
  'any',
]

function InputDataProperties({ input }: { input: InputData }) {
  const { updateInput } = useDMNStore()

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-blue-500">
        <Database className="h-5 w-5" />
        <span className="font-medium">Input Data</span>
      </div>

      <div className="space-y-2">
        <Label htmlFor="input-name">Name</Label>
        <Input
          id="input-name"
          value={input.name}
          onChange={(e) => updateInput(input.id, { name: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="input-type">Type</Label>
        <Select
          value={input.typeRef}
          onValueChange={(value: DMNDataType) =>
            updateInput(input.id, { typeRef: value })
          }
        >
          <SelectTrigger id="input-type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DATA_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="input-description">Description</Label>
        <Textarea
          id="input-description"
          value={input.description ?? ''}
          onChange={(e) =>
            updateInput(input.id, { description: e.target.value })
          }
          rows={3}
          placeholder="Optional description..."
        />
      </div>
    </div>
  )
}

function DecisionProperties({ decision }: { decision: Decision }) {
  const {
    model,
    updateDecision,
    addDecisionDependency,
    removeDecisionDependency,
    addDecisionKnowledgeRequirement,
    removeDecisionKnowledgeRequirement,
  } = useDMNStore()

  // Get available inputs and decisions for dependencies
  const availableInputs = model.inputs.filter(
    (i) => !decision.informationRequirements.some((r) => r.href === i.id)
  )
  const availableDecisions = model.decisions.filter(
    (d) =>
      d.id !== decision.id &&
      !decision.informationRequirements.some((r) => r.href === d.id)
  )
  const availableBKMs = model.businessKnowledgeModels.filter(
    (b) => !decision.knowledgeRequirements.some((r) => r.href === b.id)
  )

  // Resolve dependencies to their names
  const inputDeps = decision.informationRequirements
    .filter((r) => r.type === 'input')
    .map((r) => ({
      requirement: r,
      element: model.inputs.find((i) => i.id === r.href),
    }))
    .filter((d) => d.element)

  const decisionDeps = decision.informationRequirements
    .filter((r) => r.type === 'decision')
    .map((r) => ({
      requirement: r,
      element: model.decisions.find((d) => d.id === r.href),
    }))
    .filter((d) => d.element)

  const bkmDeps = decision.knowledgeRequirements
    .map((r) => ({
      requirement: r,
      element: model.businessKnowledgeModels.find((b) => b.id === r.href),
    }))
    .filter((d) => d.element)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-green-500">
        <GitBranch className="h-5 w-5" />
        <span className="font-medium">Decision</span>
      </div>

      <div className="space-y-2">
        <Label htmlFor="decision-name">Name</Label>
        <Input
          id="decision-name"
          value={decision.name}
          onChange={(e) =>
            updateDecision(decision.id, { name: e.target.value })
          }
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="decision-type">Output Type</Label>
        <Select
          value={decision.variable.typeRef}
          onValueChange={(value: DMNDataType) =>
            updateDecision(decision.id, {
              variable: { ...decision.variable, typeRef: value },
            })
          }
        >
          <SelectTrigger id="decision-type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DATA_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Dependencies */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm">Dependencies</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Input dependencies */}
          <div>
            <Label className="text-xs text-muted-foreground">Inputs</Label>
            <div className="flex flex-wrap gap-1 mt-1">
              {inputDeps.map(({ requirement, element }) => (
                <Badge
                  key={requirement.id}
                  variant="secondary"
                  className="gap-1"
                >
                  {element!.name}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() =>
                      removeDecisionDependency(decision.id, requirement.id)
                    }
                  />
                </Badge>
              ))}
              {availableInputs.length > 0 && (
                <Select
                  value=""
                  onValueChange={(inputId) =>
                    addDecisionDependency(decision.id, inputId, 'input')
                  }
                >
                  <SelectTrigger className="h-6 w-6 p-0 border-dashed">
                    <Plus className="h-3 w-3" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableInputs.map((input) => (
                      <SelectItem key={input.id} value={input.id}>
                        {input.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          {/* Decision dependencies */}
          <div>
            <Label className="text-xs text-muted-foreground">Decisions</Label>
            <div className="flex flex-wrap gap-1 mt-1">
              {decisionDeps.map(({ requirement, element }) => (
                <Badge key={requirement.id} variant="outline" className="gap-1">
                  {element!.name}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() =>
                      removeDecisionDependency(decision.id, requirement.id)
                    }
                  />
                </Badge>
              ))}
              {availableDecisions.length > 0 && (
                <Select
                  value=""
                  onValueChange={(decId) =>
                    addDecisionDependency(decision.id, decId, 'decision')
                  }
                >
                  <SelectTrigger className="h-6 w-6 p-0 border-dashed">
                    <Plus className="h-3 w-3" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableDecisions.map((dec) => (
                      <SelectItem key={dec.id} value={dec.id}>
                        {dec.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          {/* BKM dependencies */}
          <div>
            <Label className="text-xs text-muted-foreground">
              Business Knowledge
            </Label>
            <div className="flex flex-wrap gap-1 mt-1">
              {bkmDeps.map(({ requirement, element }) => (
                <Badge
                  key={requirement.id}
                  variant="secondary"
                  className="gap-1 bg-purple-100 text-purple-700"
                >
                  {element!.name}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() =>
                      removeDecisionKnowledgeRequirement(
                        decision.id,
                        requirement.id
                      )
                    }
                  />
                </Badge>
              ))}
              {availableBKMs.length > 0 && (
                <Select
                  value=""
                  onValueChange={(bkmId) =>
                    addDecisionKnowledgeRequirement(decision.id, bkmId)
                  }
                >
                  <SelectTrigger className="h-6 w-6 p-0 border-dashed">
                    <Plus className="h-3 w-3" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableBKMs.map((bkm) => (
                      <SelectItem key={bkm.id} value={bkm.id}>
                        {bkm.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* FEEL Expression */}
      <div className="space-y-2">
        <Label>FEEL Expression</Label>
        <FEELEditor
          value={decision.expression.text}
          onChange={(text) =>
            updateDecision(decision.id, {
              expression: { ...decision.expression, text },
            })
          }
          minHeight="150px"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="decision-description">Description</Label>
        <Textarea
          id="decision-description"
          value={decision.description ?? ''}
          onChange={(e) =>
            updateDecision(decision.id, { description: e.target.value })
          }
          rows={2}
          placeholder="Optional description..."
        />
      </div>
    </div>
  )
}

function BKMProperties({ bkm }: { bkm: BusinessKnowledgeModel }) {
  const { updateBKM } = useDMNStore()

  const addParameter = () => {
    const newParam: FormalParameter = {
      name: `param${bkm.parameters.length + 1}`,
      typeRef: 'any',
    }
    updateBKM(bkm.id, { parameters: [...bkm.parameters, newParam] })
  }

  const updateParameter = (
    index: number,
    updates: Partial<FormalParameter>
  ) => {
    const newParams = [...bkm.parameters]
    newParams[index] = { ...newParams[index], ...updates }
    updateBKM(bkm.id, { parameters: newParams })
  }

  const removeParameter = (index: number) => {
    const newParams = bkm.parameters.filter((_, i) => i !== index)
    updateBKM(bkm.id, { parameters: newParams })
  }

  // Type guard for literal expression
  const expressionText =
    'text' in bkm.expression
      ? bkm.expression.text
      : JSON.stringify(bkm.expression)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-purple-500">
        <BookOpen className="h-5 w-5" />
        <span className="font-medium">Business Knowledge Model</span>
      </div>

      <div className="space-y-2">
        <Label htmlFor="bkm-name">Name</Label>
        <Input
          id="bkm-name"
          value={bkm.name}
          onChange={(e) => updateBKM(bkm.id, { name: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="bkm-type">Return Type</Label>
        <Select
          value={bkm.variable.typeRef}
          onValueChange={(value: DMNDataType) =>
            updateBKM(bkm.id, {
              variable: { ...bkm.variable, typeRef: value },
            })
          }
        >
          <SelectTrigger id="bkm-type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DATA_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Parameters */}
      <Card>
        <CardHeader className="py-3 flex flex-row items-center justify-between">
          <CardTitle className="text-sm">Parameters</CardTitle>
          <Button variant="ghost" size="sm" onClick={addParameter}>
            <Plus className="h-3 w-3 mr-1" />
            Add
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {bkm.parameters.length === 0 ? (
            <p className="text-xs text-muted-foreground">No parameters</p>
          ) : (
            bkm.parameters.map((param, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  value={param.name}
                  onChange={(e) =>
                    updateParameter(index, { name: e.target.value })
                  }
                  className="flex-1"
                  placeholder="Parameter name"
                />
                <Select
                  value={param.typeRef}
                  onValueChange={(value: DMNDataType) =>
                    updateParameter(index, { typeRef: value })
                  }
                >
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DATA_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => removeParameter(index)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* FEEL Expression */}
      <div className="space-y-2">
        <Label>FEEL Expression</Label>
        <FEELEditor
          value={expressionText}
          onChange={(text) =>
            updateBKM(bkm.id, {
              expression: {
                id: 'text' in bkm.expression ? bkm.expression.id : generateId(),
                text,
              },
              expressionType: 'literal',
            })
          }
          minHeight="150px"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="bkm-description">Description</Label>
        <Textarea
          id="bkm-description"
          value={bkm.description ?? ''}
          onChange={(e) => updateBKM(bkm.id, { description: e.target.value })}
          rows={2}
          placeholder="Optional description..."
        />
      </div>
    </div>
  )
}

export function PropertiesPanel() {
  const { selection } = useDMNStore()
  const element = useSelectedElement()

  if (!element || !selection.type) {
    return (
      <div className="h-full flex flex-col">
        <div className="p-3 border-b">
          <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
            Properties
          </h2>
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <p className="text-sm text-muted-foreground text-center">
            Select an element to view its properties
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-3 border-b">
        <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
          Properties
        </h2>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {isInputData(element) && <InputDataProperties input={element} />}
        {isDecision(element) && <DecisionProperties decision={element} />}
        {isBKM(element) && <BKMProperties bkm={element} />}
      </div>
    </div>
  )
}
