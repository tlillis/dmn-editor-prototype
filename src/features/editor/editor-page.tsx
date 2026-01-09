import { ReactFlowProvider } from '@xyflow/react'
import { ModelExplorer } from './components/model-explorer'
import { PropertiesPanel } from './components/properties-panel'
import { GraphView } from './components/graph-view'
import { EditorToolbar } from './components/editor-toolbar'

export function EditorPage() {
  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <EditorToolbar />
      <div className="flex-1 flex overflow-hidden">
        {/* Left sidebar - Model Explorer */}
        <div className="w-64 min-w-48 max-w-80 border-r bg-muted/30 overflow-hidden flex flex-col resize-x">
          <ModelExplorer />
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
