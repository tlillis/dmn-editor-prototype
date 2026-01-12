import { useDMNStore } from '../../store/dmn-store'
import { ConstantsEditor } from '../editor/components/constants-editor'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Upload, FileJson, FileCode, Hash } from 'lucide-react'
import { exportToDMN, importFromJSON } from '../editor/utils/dmn-export'
import { useRef } from 'react'
import { Link } from '@tanstack/react-router'

export function ConstantsPage() {
  const { model, setModel, updateModelInfo } = useDMNStore()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleExportDMN = () => {
    const dmn = exportToDMN(model)
    const blob = new Blob([dmn], { type: 'application/xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${model.name.replace(/\s+/g, '_')}.dmn`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleExportJSON = () => {
    const json = JSON.stringify(model, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${model.name.replace(/\s+/g, '_')}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImportJSON = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const json = event.target?.result as string
        const importedModel = importFromJSON(json)
        setModel(importedModel)
      } catch (error) {
        console.error('Failed to import model:', error)
        alert('Failed to import model. Please check the file format.')
      }
    }
    reader.readAsText(file)

    // Reset the input so the same file can be selected again
    e.target.value = ''
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Hash className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <h1 className="text-xl font-semibold">Constants Editor</h1>
                <p className="text-sm text-muted-foreground">
                  Edit values used in decision rules
                </p>
              </div>
            </div>
            <Link
              to="/"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              ← Back to full editor
            </Link>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Input
                value={model.name}
                onChange={(e) => updateModelInfo({ name: e.target.value })}
                className="font-medium"
                placeholder="Model name"
              />
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleImportJSON}>
                <Upload className="h-4 w-4 mr-1" />
                Load
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportJSON}>
                <FileJson className="h-4 w-4 mr-1" />
                Save JSON
              </Button>
              <Button size="sm" onClick={handleExportDMN}>
                <FileCode className="h-4 w-4 mr-1" />
                Export DMN
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Constants Editor */}
      <div className="flex-1 overflow-hidden">
        <div className="max-w-3xl mx-auto h-full py-6 px-6">
          <div className="bg-white rounded-lg border shadow-sm h-full overflow-hidden">
            <ConstantsEditor />
          </div>
        </div>
      </div>

      {/* Hidden file input for import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  )
}
