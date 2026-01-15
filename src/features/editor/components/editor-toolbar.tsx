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
  Cpu,
  Check,
  X,
  Loader2,
  Settings,
  ClipboardList,
  Wrench,
  Table,
} from 'lucide-react'
import { exportToDMN } from '../utils/dmn-export'
import { useState, useEffect, useCallback } from 'react'
import { getAllEngines, getEngine } from '../../../lib/engines'
import type { EngineId } from '../../../lib/engines'
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
import { Link } from '@tanstack/react-router'

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
    selectedEngineId,
    engineConnectionStatus,
    extendedServicesConfig,
    setSelectedEngine,
    setEngineConnectionStatus,
    setExtendedServicesConfig,
  } = useDMNStore()
  const [isNewDialogOpen, setIsNewDialogOpen] = useState(false)
  const [newModelName, setNewModelName] = useState('')
  const [isCheckingConnection, setIsCheckingConnection] = useState(false)
  // Extended Services config dialog state
  const [isConfigDialogOpen, setIsConfigDialogOpen] = useState(false)
  const [configHost, setConfigHost] = useState(extendedServicesConfig.host)
  const [configPort, setConfigPort] = useState(extendedServicesConfig.port)

  const hasResults = executionContext !== null || testResults.size > 0
  const engines = getAllEngines()
  const selectedEngine = getEngine(selectedEngineId)

  // Check connection when selecting an engine that requires it
  const checkEngineConnection = useCallback(
    async (engineId: EngineId) => {
      const engine = getEngine(engineId)
      if (engine.requiresConnection && engine.checkConnection) {
        setIsCheckingConnection(true)
        try {
          const connected = await engine.checkConnection()
          setEngineConnectionStatus(engineId, connected)
        } catch {
          setEngineConnectionStatus(engineId, false)
        }
        setIsCheckingConnection(false)
      }
    },
    [setEngineConnectionStatus]
  )

  // Check Extended Services connection on mount and when selected
  useEffect(() => {
    if (
      selectedEngineId === 'extended-services' &&
      engineConnectionStatus['extended-services'] === null
    ) {
      checkEngineConnection('extended-services')
    }
  }, [selectedEngineId, engineConnectionStatus, checkEngineConnection])

  const handleEngineSelect = async (engineId: EngineId) => {
    setSelectedEngine(engineId)
    const engine = getEngine(engineId)
    if (engine.requiresConnection) {
      await checkEngineConnection(engineId)
    }
  }

  const getConnectionIcon = (engineId: EngineId) => {
    const engine = getEngine(engineId)
    if (!engine.requiresConnection) return null

    const status = engineConnectionStatus[engineId]
    if (
      status === null ||
      (isCheckingConnection && engineId === selectedEngineId)
    ) {
      return <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
    }
    if (status) {
      return <Check className="h-3 w-3 text-green-500" />
    }
    return <X className="h-3 w-3 text-red-500" />
  }

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

  const openConfigDialog = useCallback(() => {
    setConfigHost(extendedServicesConfig.host)
    setConfigPort(extendedServicesConfig.port)
    setIsConfigDialogOpen(true)
  }, [extendedServicesConfig])

  const saveConfig = useCallback(async () => {
    setExtendedServicesConfig({ host: configHost, port: configPort })
    setIsConfigDialogOpen(false)
    // Test connection with new settings
    await checkEngineConnection('extended-services')
  }, [configHost, configPort, setExtendedServicesConfig, checkEngineConnection])

  return (
    <div className="h-14 border-b bg-background flex items-center justify-between px-4">
      <div className="flex items-center gap-2">
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
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setModel(sampleSnapModel)}>
              <FlaskConical className="h-4 w-4 mr-2" />
              Load Sample (SNAP)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Tools dropdown - Screener and Constants */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Wrench className="h-4 w-4 mr-2" />
              Tools
              <ChevronDown className="h-3 w-3 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem asChild>
              <Link to="/screener" className="flex items-center">
                <ClipboardList className="h-4 w-4 mr-2" />
                Screener
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/constants" className="flex items-center">
                <Table className="h-4 w-4 mr-2" />
                Constants Editor
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Execution controls - right side */}
      <div className="flex items-center gap-2">
        {/* Engine Selector */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="min-w-[180px] justify-between"
            >
              <div className="flex items-center gap-2">
                <Cpu className="h-4 w-4" />
                <span className="truncate">{selectedEngine.name}</span>
              </div>
              <div className="flex items-center gap-1">
                {getConnectionIcon(selectedEngineId)}
                <ChevronDown className="h-3 w-3" />
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[280px]">
            {engines.map((engine) => (
              <DropdownMenuItem
                key={engine.id}
                onClick={() => handleEngineSelect(engine.id as EngineId)}
                className="flex items-start gap-3 py-2"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{engine.name}</span>
                    {engine.id === selectedEngineId && (
                      <Check className="h-3 w-3 text-primary" />
                    )}
                    {getConnectionIcon(engine.id as EngineId)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {engine.description}
                  </p>
                </div>
              </DropdownMenuItem>
            ))}
            {selectedEngineId === 'extended-services' && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={openConfigDialog}>
                  <Settings className="h-4 w-4 mr-2" />
                  Configure Connection...
                </DropdownMenuItem>
                {engineConnectionStatus[selectedEngineId] === false && (
                  <div className="px-2 py-2">
                    <p className="text-xs text-red-500">
                      Cannot connect to {selectedEngine.name} at{' '}
                      {extendedServicesConfig.host}:
                      {extendedServicesConfig.port}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2 w-full"
                      onClick={(e) => {
                        e.preventDefault()
                        checkEngineConnection(selectedEngineId)
                      }}
                    >
                      <Loader2
                        className={`h-3 w-3 mr-2 ${isCheckingConnection ? 'animate-spin' : ''}`}
                      />
                      Retry Connection
                    </Button>
                  </div>
                )}
              </>
            )}
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
            <Button variant="outline" onClick={() => setIsNewDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleNewModel}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Extended Services Configuration Dialog */}
      <Dialog open={isConfigDialogOpen} onOpenChange={setIsConfigDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configure Extended Services</DialogTitle>
            <DialogDescription>
              Configure the connection to KIE Extended Services.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <Label htmlFor="config-host">Host</Label>
              <Input
                id="config-host"
                value={configHost}
                onChange={(e) => setConfigHost(e.target.value)}
                placeholder="localhost"
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="config-port">Port</Label>
              <Input
                id="config-port"
                type="number"
                value={configPort}
                onChange={(e) =>
                  setConfigPort(parseInt(e.target.value, 10) || 0)
                }
                placeholder="21345"
                className="mt-2"
              />
            </div>
            <p className="text-sm text-muted-foreground">
              URL: http://{configHost}:{configPort}
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsConfigDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={saveConfig}>Save & Test</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
