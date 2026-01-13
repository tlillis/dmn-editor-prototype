import { useEffect, useRef, useCallback } from 'react'
import { EditorState } from '@codemirror/state'
import {
  EditorView,
  keymap,
  lineNumbers,
  highlightActiveLine,
} from '@codemirror/view'
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { syntaxHighlighting, HighlightStyle } from '@codemirror/language'
import { tags as t } from '@lezer/highlight'
import { feelLanguage } from '../lib/feel-language'
import { cn } from '../lib/utils'

// Custom highlight style for FEEL
const feelHighlightStyle = HighlightStyle.define([
  { tag: t.keyword, color: '#8b5cf6', fontWeight: 'bold' }, // purple
  { tag: t.function(t.variableName), color: '#0891b2' }, // cyan
  { tag: t.variableName, color: '#1e40af' }, // blue
  { tag: t.string, color: '#16a34a' }, // green
  { tag: t.number, color: '#ea580c' }, // orange
  { tag: t.bool, color: '#8b5cf6' }, // purple
  { tag: t.operator, color: '#64748b' }, // slate
  { tag: t.punctuation, color: '#64748b' }, // slate
  { tag: t.comment, color: '#9ca3af', fontStyle: 'italic' }, // gray
])

// Base theme for the editor
const baseTheme = EditorView.theme({
  '&': {
    fontSize: '13px',
    fontFamily:
      'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
  },
  '.cm-content': {
    padding: '8px 0',
    minHeight: '60px',
  },
  '.cm-line': {
    padding: '0 8px',
  },
  '.cm-gutters': {
    backgroundColor: '#f8fafc',
    borderRight: '1px solid #e2e8f0',
    color: '#94a3b8',
  },
  '.cm-activeLineGutter': {
    backgroundColor: '#f1f5f9',
  },
  '.cm-activeLine': {
    backgroundColor: '#f8fafc',
  },
  '&.cm-focused': {
    outline: 'none',
  },
  '.cm-scroller': {
    overflow: 'auto',
  },
})

interface FEELEditorProps {
  value: string
  onChange: (value: string) => void
  className?: string
  placeholder?: string
  minHeight?: string
  showLineNumbers?: boolean
}

export function FEELEditor({
  value,
  onChange,
  className,
  placeholder = 'Enter FEEL expression...',
  minHeight = '80px',
  showLineNumbers = true,
}: FEELEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const onChangeRef = useRef(onChange)

  // Keep onChange ref up to date
  onChangeRef.current = onChange

  // Create update listener
  const updateListener = useCallback(
    () =>
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          onChangeRef.current(update.state.doc.toString())
        }
      }),
    []
  )

  // Initialize editor
  useEffect(() => {
    if (!containerRef.current) return

    const extensions = [
      baseTheme,
      feelLanguage,
      syntaxHighlighting(feelHighlightStyle),
      history(),
      keymap.of([...defaultKeymap, ...historyKeymap]),
      highlightActiveLine(),
      updateListener(),
      EditorView.lineWrapping,
      EditorState.tabSize.of(2),
    ]

    if (showLineNumbers) {
      extensions.push(lineNumbers())
    }

    // Add placeholder
    if (placeholder) {
      extensions.push(
        EditorView.theme({
          '.cm-content[data-placeholder]::before': {
            content: `"${placeholder}"`,
            position: 'absolute',
            color: '#9ca3af',
            pointerEvents: 'none',
          },
        })
      )
      extensions.push(
        EditorView.contentAttributes.of((view) =>
          view.state.doc.length === 0 ? { 'data-placeholder': '' } : null
        )
      )
    }

    const state = EditorState.create({
      doc: value,
      extensions,
    })

    const view = new EditorView({
      state,
      parent: containerRef.current,
    })

    viewRef.current = view

    return () => {
      view.destroy()
      viewRef.current = null
    }
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Update content when value prop changes externally
  useEffect(() => {
    const view = viewRef.current
    if (!view) return

    const currentValue = view.state.doc.toString()
    if (value !== currentValue) {
      view.dispatch({
        changes: {
          from: 0,
          to: view.state.doc.length,
          insert: value,
        },
      })
    }
  }, [value])

  return (
    <div
      ref={containerRef}
      className={cn(
        'border rounded-md overflow-hidden bg-white focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2',
        className
      )}
      style={{ minHeight }}
    />
  )
}
