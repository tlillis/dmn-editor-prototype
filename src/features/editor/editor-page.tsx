import { ReactFlowProvider } from '@xyflow/react'
import { ModelExplorer } from './components/model-explorer'
import { PropertiesPanel } from './components/properties-panel'
import { GraphView } from './components/graph-view'
import { EditorToolbar } from './components/editor-toolbar'
import { ConstantsEditor } from './components/constants-editor'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs'
import { FolderTree, Hash } from 'lucide-react'

export function EditorPage() {
  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <EditorToolbar />
      <div className="flex-1 flex overflow-hidden">
        {/* Left sidebar - Model Explorer & Constants */}
        <div className="w-72 min-w-56 max-w-96 border-r bg-muted/30 overflow-hidden flex flex-col">
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
              </TabsList>
            </div>
            <TabsContent value="model" className="flex-1 overflow-hidden">
              <ModelExplorer />
            </TabsContent>
            <TabsContent value="constants" className="flex-1 overflow-hidden">
              <ConstantsEditor />
            </TabsContent>
          </Tabs>
        </div>

        {/* Center - Graph View */}
        <div className="flex-1 bg-gray-50 overflow-hidden">
          <ReactFlowProvider>
            <GraphView />
          </ReactFlowProvider>
        </div>

        {/* Right sidebar - Properties Panel */}
        <div className="w-80 min-w-64 max-w-96 border-l bg-muted/30 overflow-hidden flex flex-col">
          <PropertiesPanel />
        </div>
      </div>
    </div>
  )
}
