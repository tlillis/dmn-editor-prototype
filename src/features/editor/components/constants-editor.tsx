import { useDMNStore } from '../../../store/dmn-store'
import type { Constant } from '../../../types/dmn'
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
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '../../../components/ui/card'
import { Plus, Trash2, Hash, Type, ToggleLeft } from 'lucide-react'
import { cn } from '../../../lib/utils'

const CONSTANT_TYPES = ['number', 'string', 'boolean'] as const

function ConstantCard({
  constant,
  isSelected,
  onSelect,
}: {
  constant: Constant
  isSelected: boolean
  onSelect: () => void
}) {
  const { updateConstant, deleteConstant } = useDMNStore()

  const handleValueChange = (newValue: string) => {
    let parsedValue: number | string | boolean = newValue
    if (constant.type === 'number') {
      parsedValue = parseFloat(newValue) || 0
    } else if (constant.type === 'boolean') {
      parsedValue = newValue === 'true'
    }
    updateConstant(constant.id, { value: parsedValue })
  }

  const handleTypeChange = (newType: 'number' | 'string' | 'boolean') => {
    let newValue: number | string | boolean
    if (newType === 'number') {
      newValue = typeof constant.value === 'number' ? constant.value : 0
    } else if (newType === 'boolean') {
      newValue = Boolean(constant.value)
    } else {
      newValue = String(constant.value)
    }
    updateConstant(constant.id, { type: newType, value: newValue })
  }

  const TypeIcon =
    constant.type === 'number' ? Hash : constant.type === 'boolean' ? ToggleLeft : Type

  return (
    <Card
      className={cn(
        'cursor-pointer transition-colors relative',
        isSelected ? 'ring-2 ring-primary' : 'hover:bg-muted/50'
      )}
      onClick={onSelect}
    >
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 text-muted-foreground hover:text-destructive absolute top-2 right-2"
        onClick={(e) => {
          e.stopPropagation()
          deleteConstant(constant.id)
        }}
      >
        <Trash2 className="h-3 w-3" />
      </Button>
      <CardHeader className="py-3 px-4 pr-10">
        <div className="flex items-start gap-2">
          <TypeIcon className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
          <CardTitle className="text-sm font-mono break-all">{constant.name}</CardTitle>
        </div>
        {constant.description && (
          <CardDescription className="text-xs mt-1 line-clamp-2">
            {constant.description}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="py-2 px-4">
        <div className="flex items-center gap-2">
          {constant.type === 'boolean' ? (
            <Select
              value={String(constant.value)}
              onValueChange={handleValueChange}
            >
              <SelectTrigger className="flex-1 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">true</SelectItem>
                <SelectItem value="false">false</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <Input
              value={String(constant.value)}
              onChange={(e) => handleValueChange(e.target.value)}
              type={constant.type === 'number' ? 'number' : 'text'}
              className="flex-1 h-8 font-mono"
              onClick={(e) => e.stopPropagation()}
            />
          )}
          <Select value={constant.type} onValueChange={handleTypeChange}>
            <SelectTrigger className="w-24 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CONSTANT_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  )
}

function ConstantDetailEditor({ constant }: { constant: Constant }) {
  const { updateConstant } = useDMNStore()

  return (
    <div className="space-y-4 p-4 border-t">
      <h3 className="font-medium text-sm">Edit Constant</h3>

      <div className="space-y-2">
        <Label htmlFor="constant-name">Variable Name</Label>
        <Input
          id="constant-name"
          value={constant.name}
          onChange={(e) =>
            updateConstant(constant.id, {
              name: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '_'),
            })
          }
          className="font-mono"
          placeholder="CONSTANT_NAME"
        />
        <p className="text-xs text-muted-foreground">
          Use UPPER_SNAKE_CASE for consistency
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="constant-category">Category</Label>
        <Input
          id="constant-category"
          value={constant.category ?? ''}
          onChange={(e) =>
            updateConstant(constant.id, { category: e.target.value })
          }
          placeholder="e.g., Income Limits, Deductions"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="constant-description">Description</Label>
        <Textarea
          id="constant-description"
          value={constant.description ?? ''}
          onChange={(e) =>
            updateConstant(constant.id, { description: e.target.value })
          }
          rows={2}
          placeholder="What this constant represents..."
        />
      </div>
    </div>
  )
}

export function ConstantsEditor() {
  const { model, selection, addConstant, select } = useDMNStore()
  const constants = model.constants

  // Group constants by category
  const groupedConstants = constants.reduce(
    (acc, constant) => {
      const category = constant.category || 'Uncategorized'
      if (!acc[category]) {
        acc[category] = []
      }
      acc[category].push(constant)
      return acc
    },
    {} as Record<string, Constant[]>
  )

  const selectedConstant =
    selection.type === 'constant'
      ? constants.find((c) => c.id === selection.id)
      : null

  const handleAddConstant = () => {
    addConstant()
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-3 border-b flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
            Constants
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Values that can be modified without changing rules
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={handleAddConstant}>
          <Plus className="h-4 w-4 mr-1" />
          Add
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {Object.keys(groupedConstants).length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Hash className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No constants defined</p>
            <p className="text-xs mt-1">
              Add constants to make your rules configurable
            </p>
          </div>
        ) : (
          Object.entries(groupedConstants)
            .sort(([a], [b]) => {
              if (a === 'Uncategorized') return 1
              if (b === 'Uncategorized') return -1
              return a.localeCompare(b)
            })
            .map(([category, categoryConstants]) => (
              <div key={category}>
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                  {category}
                </h3>
                <div className="space-y-2">
                  {categoryConstants.map((constant) => (
                    <ConstantCard
                      key={constant.id}
                      constant={constant}
                      isSelected={selection.id === constant.id}
                      onSelect={() => select('constant', constant.id)}
                    />
                  ))}
                </div>
              </div>
            ))
        )}
      </div>

      {selectedConstant && <ConstantDetailEditor constant={selectedConstant} />}
    </div>
  )
}
