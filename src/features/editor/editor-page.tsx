import { useState } from 'react'
import { ModelExplorer } from './components/model-explorer'
import { PropertiesPanel } from './components/properties-panel'
import { GraphView } from './components/graph-view'
import { EditorToolbar } from './components/editor-toolbar'
import { ConstantsEditor } from './components/constants-editor'
import { ExecutionPanel } from './components/execution-panel'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../../components/ui/tabs'
import { Button } from '../../components/ui/button'
import {
  FolderTree,
  Hash,
  Play,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
} from 'lucide-react'
import { cn } from '../../lib/utils'

export function EditorPage() {
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true)
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true)

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <EditorToolbar />
      <div className="flex-1 flex overflow-hidden">
        {/* Left sidebar - Model Explorer & Constants */}
        <div
          className={cn(
            'border-r bg-muted/30 overflow-hidden flex flex-col transition-all duration-300',
            leftSidebarOpen
              ? 'w-72 min-w-56 max-w-96'
              : 'w-0 min-w-0 border-r-0'
          )}
        >
          {leftSidebarOpen && (
            <Tabs defaultValue="model" className="h-full flex flex-col">
              <div className="p-2 border-b">
                <TabsList className="w-full">
                  <TabsTrigger value="model" className="flex-1">
                    <FolderTree className="h-4 w-4 mr-1" />
                    Model
                  </TabsTrigger>
                  <TabsTrigger value="constants" className="flex-1">
                    <Hash className="h-4 w-4 mr-1" />
                    Constants
                  </TabsTrigger>
                  <TabsTrigger value="execute" className="flex-1">
                    <Play className="h-4 w-4 mr-1" />
                    Execute
                  </TabsTrigger>
                </TabsList>
              </div>
              <TabsContent value="model" className="flex-1 overflow-hidden">
                <ModelExplorer />
              </TabsContent>
              <TabsContent value="constants" className="flex-1 overflow-hidden">
                <ConstantsEditor />
              </TabsContent>
              <TabsContent value="execute" className="flex-1 overflow-hidden">
                <ExecutionPanel />
              </TabsContent>
            </Tabs>
          )}
        </div>

        {/* Center - Graph View */}
        <div className="flex-1 bg-gray-50 overflow-hidden relative">
          {/* Left sidebar toggle - vertically centered */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-white/80 hover:bg-white shadow-sm"
            onClick={() => setLeftSidebarOpen(!leftSidebarOpen)}
            title={leftSidebarOpen ? 'Hide left panel' : 'Show left panel'}
          >
            {leftSidebarOpen ? (
              <PanelLeftClose className="h-4 w-4" />
            ) : (
              <PanelLeftOpen className="h-4 w-4" />
            )}
          </Button>

          {/* Right sidebar toggle - vertically centered */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-white/80 hover:bg-white shadow-sm"
            onClick={() => setRightSidebarOpen(!rightSidebarOpen)}
            title={rightSidebarOpen ? 'Hide right panel' : 'Show right panel'}
          >
            {rightSidebarOpen ? (
              <PanelRightClose className="h-4 w-4" />
            ) : (
              <PanelRightOpen className="h-4 w-4" />
            )}
          </Button>

          <GraphView />
        </div>

        {/* Right sidebar - Properties Panel */}
        <div
          className={cn(
            'border-l bg-muted/30 overflow-hidden flex flex-col transition-all duration-300',
            rightSidebarOpen
              ? 'w-80 min-w-64 max-w-96'
              : 'w-0 min-w-0 border-l-0'
          )}
        >
          {rightSidebarOpen && <PropertiesPanel />}
        </div>
      </div>
    </div>
  )
}
