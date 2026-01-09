import { useDMNStore } from '../../../store/dmn-store'
import {
  ChevronDown,
  ChevronRight,
  Database,
  GitBranch,
  BookOpen,
  Plus,
  Trash2,
} from 'lucide-react'
import { useState } from 'react'
import { Button } from '../../../components/ui/button'
import { cn } from '../../../lib/utils'
import type {
  InputData,
  Decision,
  BusinessKnowledgeModel,
} from '../../../types/dmn'

interface CollapsibleSectionProps {
  title: string
  icon: React.ReactNode
  count: number
  children: React.ReactNode
  onAdd: () => void
  defaultOpen?: boolean
}

function CollapsibleSection({
  title,
  icon,
  count,
  children,
  onAdd,
  defaultOpen = true,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className="mb-2">
      <div
        className="flex items-center justify-between px-2 py-1.5 hover:bg-muted rounded cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2">
          {isOpen ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
          {icon}
          <span className="text-sm font-medium">
            {title} ({count})
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={(e) => {
            e.stopPropagation()
            onAdd()
          }}
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>
      {isOpen && <div className="ml-4 mt-1">{children}</div>}
    </div>
  )
}

interface ItemRowProps {
  id: string
  name: string
  typeRef?: string
  isSelected: boolean
  onClick: () => void
  onDelete: () => void
}

function ItemRow({
  name,
  typeRef,
  isSelected,
  onClick,
  onDelete,
}: ItemRowProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-between px-2 py-1 rounded cursor-pointer group',
        isSelected ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
      )}
      onClick={onClick}
    >
      <div className="flex flex-col min-w-0">
        <span className="text-sm truncate">{name}</span>
        {typeRef && (
          <span
            className={cn(
              'text-xs',
              isSelected
                ? 'text-primary-foreground/70'
                : 'text-muted-foreground'
            )}
          >
            {typeRef}
          </span>
        )}
      </div>
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          'h-6 w-6 opacity-0 group-hover:opacity-100',
          isSelected && 'hover:bg-primary-foreground/20'
        )}
        onClick={(e) => {
          e.stopPropagation()
          onDelete()
        }}
      >
        <Trash2 className="h-3 w-3" />
      </Button>
    </div>
  )
}

export function ModelExplorer() {
  const {
    model,
    selection,
    select,
    addInput,
    deleteInput,
    addDecision,
    deleteDecision,
    addBKM,
    deleteBKM,
  } = useDMNStore()

  return (
    <div className="h-full flex flex-col">
      <div className="p-3 border-b">
        <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
          Model Explorer
        </h2>
        <p className="text-sm font-medium mt-1 truncate" title={model.name}>
          {model.name}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {/* Inputs Section */}
        <CollapsibleSection
          title="Inputs"
          icon={<Database className="h-4 w-4 text-blue-500" />}
          count={model.inputs.length}
          onAdd={() => addInput()}
        >
          {model.inputs.length === 0 ? (
            <p className="text-xs text-muted-foreground px-2 py-1">
              No inputs defined
            </p>
          ) : (
            model.inputs.map((input: InputData) => (
              <ItemRow
                key={input.id}
                id={input.id}
                name={input.name}
                typeRef={input.typeRef}
                isSelected={
                  selection.type === 'input' && selection.id === input.id
                }
                onClick={() => select('input', input.id)}
                onDelete={() => deleteInput(input.id)}
              />
            ))
          )}
        </CollapsibleSection>

        {/* BKMs Section */}
        <CollapsibleSection
          title="Business Knowledge"
          icon={<BookOpen className="h-4 w-4 text-purple-500" />}
          count={model.businessKnowledgeModels.length}
          onAdd={() => addBKM()}
        >
          {model.businessKnowledgeModels.length === 0 ? (
            <p className="text-xs text-muted-foreground px-2 py-1">
              No business knowledge models
            </p>
          ) : (
            model.businessKnowledgeModels.map((bkm: BusinessKnowledgeModel) => (
              <ItemRow
                key={bkm.id}
                id={bkm.id}
                name={bkm.name}
                typeRef={bkm.variable.typeRef}
                isSelected={selection.type === 'bkm' && selection.id === bkm.id}
                onClick={() => select('bkm', bkm.id)}
                onDelete={() => deleteBKM(bkm.id)}
              />
            ))
          )}
        </CollapsibleSection>

        {/* Decisions Section */}
        <CollapsibleSection
          title="Decisions"
          icon={<GitBranch className="h-4 w-4 text-green-500" />}
          count={model.decisions.length}
          onAdd={() => addDecision()}
        >
          {model.decisions.length === 0 ? (
            <p className="text-xs text-muted-foreground px-2 py-1">
              No decisions defined
            </p>
          ) : (
            model.decisions.map((decision: Decision) => (
              <ItemRow
                key={decision.id}
                id={decision.id}
                name={decision.name}
                typeRef={decision.variable.typeRef}
                isSelected={
                  selection.type === 'decision' && selection.id === decision.id
                }
                onClick={() => select('decision', decision.id)}
                onDelete={() => deleteDecision(decision.id)}
              />
            ))
          )}
        </CollapsibleSection>
      </div>
    </div>
  )
}
