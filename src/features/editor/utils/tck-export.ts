/**
 * Export test cases to DMN TCK (Technology Compatibility Kit) XML format
 * Spec: http://www.omg.org/spec/DMN/20180521/testcase
 */

import type { DMNModel, TestCase } from '../../../types/dmn'

// XML escape helper
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

// Convert a JavaScript value to TCK XML value element
function valueToTckXml(value: unknown, indent: string = ''): string {
  if (value === null || value === undefined) {
    return `${indent}<value xsi:nil="true"/>`
  }

  if (typeof value === 'boolean') {
    return `${indent}<value xsi:type="xsd:boolean">${value}</value>`
  }

  if (typeof value === 'number') {
    // Use decimal for all numbers (TCK standard)
    return `${indent}<value xsi:type="xsd:decimal">${value}</value>`
  }

  if (typeof value === 'string') {
    return `${indent}<value xsi:type="xsd:string">${escapeXml(value)}</value>`
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return `${indent}<value xsi:type="tck:list"/>`
    }
    const items = value
      .map(
        (item) =>
          `${indent}  <item>\n${valueToTckXml(item, indent + '    ')}\n${indent}  </item>`
      )
      .join('\n')
    return `${indent}<value xsi:type="tck:list">\n${items}\n${indent}</value>`
  }

  if (typeof value === 'object') {
    // Context/object type
    const entries = Object.entries(value as Record<string, unknown>)
    if (entries.length === 0) {
      return `${indent}<value xsi:type="tck:context"/>`
    }
    const components = entries
      .map(
        ([key, val]) =>
          `${indent}  <component name="${escapeXml(key)}">\n${valueToTckXml(val, indent + '    ')}\n${indent}  </component>`
      )
      .join('\n')
    return `${indent}<value xsi:type="tck:context">\n${components}\n${indent}</value>`
  }

  // Fallback to string
  return `${indent}<value xsi:type="xsd:string">${escapeXml(String(value))}</value>`
}

// Export a single test case to TCK XML
function testCaseToTckXml(testCase: TestCase, model: DMNModel): string {
  const lines: string[] = []

  lines.push(
    `  <testCase id="${escapeXml(testCase.id)}" name="${escapeXml(testCase.name)}">`
  )

  if (testCase.description) {
    lines.push(
      `    <description>${escapeXml(testCase.description)}</description>`
    )
  }

  // Input nodes - need to map input ID to input name
  for (const [inputId, value] of Object.entries(testCase.inputs)) {
    const input = model.inputs.find((i) => i.id === inputId)
    if (input) {
      lines.push(`    <inputNode name="${escapeXml(input.name)}">`)
      lines.push(valueToTckXml(value, '      '))
      lines.push(`    </inputNode>`)
    }
  }

  // Result nodes (expectations) - use the stored nodeName
  for (const expectation of testCase.expectations) {
    // Try to find the decision to get the current name (in case it was renamed)
    const decision = model.decisions.find((d) => d.id === expectation.nodeId)
    const nodeName = decision ? decision.name : expectation.nodeName

    lines.push(`    <resultNode name="${escapeXml(nodeName)}" type="decision">`)
    lines.push(`      <expected>`)
    lines.push(valueToTckXml(expectation.expectedValue, '        '))
    lines.push(`      </expected>`)
    lines.push(`    </resultNode>`)
  }

  lines.push(`  </testCase>`)

  return lines.join('\n')
}

// Export all test cases to TCK XML
export function exportToTck(model: DMNModel): string {
  const lines: string[] = []

  lines.push(`<?xml version="1.0" encoding="UTF-8"?>`)
  lines.push(`<testCases xmlns="http://www.omg.org/spec/DMN/20180521/testcase"`)
  lines.push(`           xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"`)
  lines.push(`           xmlns:xsd="http://www.w3.org/2001/XMLSchema"`)
  lines.push(`           xmlns:tck="http://www.omg.org/spec/DMN/20180521/tck">`)

  // Add model reference as a comment
  lines.push(`  <!-- Test cases for DMN model: ${escapeXml(model.name)} -->`)
  lines.push(``)

  for (const testCase of model.testCases) {
    lines.push(testCaseToTckXml(testCase, model))
    lines.push(``)
  }

  lines.push(`</testCases>`)

  return lines.join('\n')
}
