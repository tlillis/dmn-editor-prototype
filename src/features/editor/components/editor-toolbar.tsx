import { useDMNStore } from '../../../store/dmn-store'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import {
  FilePlus,
  Download,
  Upload,
  Play,
  FileJson,
  FlaskConical,
  Eraser,
  FolderOpen,
  ChevronDown,
} from 'lucide-react'
import { exportToDMN } from '../utils/dmn-export'
import { useState } from 'react'
import { sampleSnapModel } from '../data/sample-snap-model'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../../components/ui/dropdown-menu'
import { Label } from '../../../components/ui/label'

interface EditorToolbarProps {
  onRunClick?: () => void
}

export function EditorToolbar({ onRunClick }: EditorToolbarProps) {
  const {
    model,
    isDirty,
    newModel,
    updateModelInfo,
    setModel,
    clearAllResults,
    executionContext,
    testResults,
  } = useDMNStore()
  const [isNewDialogOpen, setIsNewDialogOpen] = useState(false)
  const [newModelName, setNewModelName] = useState('')

  const hasResults = executionContext !== null || testResults.size > 0

  const handleExportDMN = () => {
    const xml = exportToDMN(model)
    const blob = new Blob([xml], { type: 'application/xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${model.name.replace(/\s+/g, '_')}.dmn`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleExportJSON = () => {
    const json = JSON.stringify(model, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${model.name.replace(/\s+/g, '_')}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleImportJSON = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        const text = await file.text()
        try {
          const imported = JSON.parse(text)
          setModel(imported)
        } catch {
          alert('Invalid JSON file')
        }
      }
    }
    input.click()
  }

  const handleNewModel = () => {
    newModel()
    if (newModelName.trim()) {
      updateModelInfo({ name: newModelName.trim() })
    }
    setNewModelName('')
    setIsNewDialogOpen(false)
  }

  return (
    <div className="h-14 border-b bg-background flex items-center justify-between px-4">
      <div className="flex items-center gap-4">
        {/* Model name (editable) */}
        <Input
          value={model.name}
          onChange={(e) => updateModelInfo({ name: e.target.value })}
          className="w-64 font-semibold"
        />
        {isDirty && (
          <span className="text-xs text-muted-foreground">
            (unsaved changes)
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        {/* File dropdown - New and Samples */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <FolderOpen className="h-4 w-4 mr-2" />
              File
              <ChevronDown className="h-3 w-3 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => setIsNewDialogOpen(true)}>
              <FilePlus className="h-4 w-4 mr-2" />
              New Model
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setModel(sampleSnapModel)}>
              <FlaskConical className="h-4 w-4 mr-2" />
              Load Sample (SNAP)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* New Model Dialog */}
        <Dialog open={isNewDialogOpen} onOpenChange={setIsNewDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Model</DialogTitle>
              <DialogDescription>
                This will clear the current model. Make sure to save your work
                first.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Label htmlFor="new-model-name">Model Name</Label>
              <Input
                id="new-model-name"
                value={newModelName}
                onChange={(e) => setNewModelName(e.target.value)}
                placeholder="New DMN Model"
                className="mt-2"
              />
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsNewDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleNewModel}>Create</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Import/Export dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Import/Export
              <ChevronDown className="h-3 w-3 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={handleImportJSON}>
              <Upload className="h-4 w-4 mr-2" />
              Import JSON
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleExportJSON}>
              <FileJson className="h-4 w-4 mr-2" />
              Save as JSON
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleExportDMN}>
              <Download className="h-4 w-4 mr-2" />
              Export as DMN
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Clear Results */}
        <Button
          variant="ghost"
          size="sm"
          onClick={clearAllResults}
          disabled={!hasResults}
          title="Clear all execution and test results"
        >
          <Eraser className="h-4 w-4 mr-2" />
          Clear Results
        </Button>

        {/* Run - opens Execute panel */}
        <Button variant="default" size="sm" onClick={onRunClick}>
          <Play className="h-4 w-4 mr-2" />
          Run
        </Button>
      </div>
    </div>
  )
}
