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
  DialogTrigger,
} from '../../../components/ui/dialog'
import { Label } from '../../../components/ui/label'

export function EditorToolbar() {
  const { model, isDirty, newModel, updateModelInfo, setModel } = useDMNStore()
  const [isNewDialogOpen, setIsNewDialogOpen] = useState(false)
  const [newModelName, setNewModelName] = useState('')

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
        {/* New Model */}
        <Dialog open={isNewDialogOpen} onOpenChange={setIsNewDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <FilePlus className="h-4 w-4 mr-2" />
              New
            </Button>
          </DialogTrigger>
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

        {/* Load Sample SNAP Model */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setModel(sampleSnapModel)}
        >
          <FlaskConical className="h-4 w-4 mr-2" />
          Load Sample
        </Button>

        {/* Import JSON */}
        <Button variant="outline" size="sm" onClick={handleImportJSON}>
          <Upload className="h-4 w-4 mr-2" />
          Import
        </Button>

        {/* Export JSON */}
        <Button variant="outline" size="sm" onClick={handleExportJSON}>
          <FileJson className="h-4 w-4 mr-2" />
          Save JSON
        </Button>

        {/* Export DMN */}
        <Button variant="default" size="sm" onClick={handleExportDMN}>
          <Download className="h-4 w-4 mr-2" />
          Export DMN
        </Button>

        {/* Run (placeholder for future) */}
        <Button variant="secondary" size="sm" disabled>
          <Play className="h-4 w-4 mr-2" />
          Run
        </Button>
      </div>
    </div>
  )
}
