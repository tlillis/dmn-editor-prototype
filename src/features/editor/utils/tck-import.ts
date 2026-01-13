/**
 * Import test cases from DMN TCK (Technology Compatibility Kit) XML format
 * Spec: http://www.omg.org/spec/DMN/20180521/testcase
 */

import type { DMNModel, TestCase, TestExpectation } from '../../../types/dmn'
import { generateId } from '../../../types/dmn'

export interface TckImportResult {
  testCases: TestCase[]
  warnings: string[]
  errors: string[]
}

// Parse a TCK value element to JavaScript value
function parseTckValue(valueElement: Element): unknown {
  // Check for nil
  const nilAttr = valueElement.getAttribute('xsi:nil')
  if (nilAttr === 'true') {
    return null
  }

  const typeAttr = valueElement.getAttribute('xsi:type')

  // Handle typed values
  if (typeAttr) {
    const typeName = typeAttr.includes(':') ? typeAttr.split(':')[1] : typeAttr

    switch (typeName) {
      case 'boolean':
        return valueElement.textContent?.trim().toLowerCase() === 'true'

      case 'decimal':
      case 'integer':
      case 'double':
      case 'float':
        return parseFloat(valueElement.textContent?.trim() || '0')

      case 'string':
        return valueElement.textContent || ''

      case 'list': {
        const items: unknown[] = []
        const itemElements = valueElement.getElementsByTagName('item')
        for (let i = 0; i < itemElements.length; i++) {
          const itemEl = itemElements[i]
          const itemValue = itemEl.getElementsByTagName('value')[0]
          if (itemValue) {
            items.push(parseTckValue(itemValue))
          }
        }
        return items
      }

      case 'context': {
        const context: Record<string, unknown> = {}
        const componentElements = valueElement.getElementsByTagName('component')
        for (let i = 0; i < componentElements.length; i++) {
          const compEl = componentElements[i]
          const name = compEl.getAttribute('name')
          const compValue = compEl.getElementsByTagName('value')[0]
          if (name && compValue) {
            context[name] = parseTckValue(compValue)
          }
        }
        return context
      }
    }
  }

  // Fallback: try to infer type from content
  const text = valueElement.textContent?.trim() || ''

  if (text === 'true') return true
  if (text === 'false') return false

  const num = parseFloat(text)
  if (!isNaN(num) && text !== '') return num

  return text
}

// Parse a single testCase element
function parseTestCase(
  testCaseElement: Element,
  model: DMNModel,
  warnings: string[]
): TestCase | null {
  const id = testCaseElement.getAttribute('id') || generateId()
  const name = testCaseElement.getAttribute('name') || 'Imported Test Case'

  // Get description
  const descEl = testCaseElement.getElementsByTagName('description')[0]
  const description = descEl?.textContent || undefined

  // Parse input nodes
  const inputs: Record<string, unknown> = {}
  const inputNodeElements = testCaseElement.getElementsByTagName('inputNode')

  for (let i = 0; i < inputNodeElements.length; i++) {
    const inputNode = inputNodeElements[i]
    // Only process direct children (not nested in resultNode)
    if (inputNode.parentElement !== testCaseElement) continue

    const inputName = inputNode.getAttribute('name')
    if (!inputName) continue

    // Find matching input in model by name
    const modelInput = model.inputs.find(
      (inp) => inp.name.toLowerCase() === inputName.toLowerCase()
    )

    if (!modelInput) {
      warnings.push(
        `Test "${name}": Input "${inputName}" not found in model, skipped`
      )
      continue
    }

    const valueEl = inputNode.getElementsByTagName('value')[0]
    if (valueEl) {
      inputs[modelInput.id] = parseTckValue(valueEl)
    }
  }

  // Parse result nodes (expectations)
  const expectations: TestExpectation[] = []
  const resultNodeElements = testCaseElement.getElementsByTagName('resultNode')

  for (let i = 0; i < resultNodeElements.length; i++) {
    const resultNode = resultNodeElements[i]
    // Only process direct children
    if (resultNode.parentElement !== testCaseElement) continue

    const nodeName = resultNode.getAttribute('name')
    const nodeType = resultNode.getAttribute('type')

    if (!nodeName) continue

    // We only support decision result nodes for now
    if (nodeType && nodeType !== 'decision') {
      warnings.push(
        `Test "${name}": Result node type "${nodeType}" not supported, skipped`
      )
      continue
    }

    // Find matching decision in model by name
    const decision = model.decisions.find(
      (d) => d.name.toLowerCase() === nodeName.toLowerCase()
    )

    if (!decision) {
      warnings.push(
        `Test "${name}": Decision "${nodeName}" not found in model, skipped`
      )
      continue
    }

    // Get expected value
    const expectedEl = resultNode.getElementsByTagName('expected')[0]
    const valueEl = expectedEl?.getElementsByTagName('value')[0]

    if (valueEl) {
      expectations.push({
        nodeId: decision.id,
        nodeName: decision.name,
        expectedValue: parseTckValue(valueEl),
      })
    }
  }

  const now = Date.now()

  return {
    id,
    name,
    description,
    inputs,
    expectations,
    createdAt: now,
    updatedAt: now,
  }
}

// Import test cases from TCK XML string
export function importFromTck(xml: string, model: DMNModel): TckImportResult {
  const result: TckImportResult = {
    testCases: [],
    warnings: [],
    errors: [],
  }

  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(xml, 'application/xml')

    // Check for parse errors
    const parseError = doc.querySelector('parsererror')
    if (parseError) {
      result.errors.push(`XML parse error: ${parseError.textContent}`)
      return result
    }

    // Find all testCase elements
    const testCaseElements = doc.getElementsByTagName('testCase')

    if (testCaseElements.length === 0) {
      result.warnings.push('No test cases found in TCK file')
      return result
    }

    for (let i = 0; i < testCaseElements.length; i++) {
      const testCase = parseTestCase(
        testCaseElements[i],
        model,
        result.warnings
      )
      if (testCase) {
        result.testCases.push(testCase)
      }
    }

    if (result.testCases.length === 0) {
      result.errors.push('No valid test cases could be imported')
    }
  } catch (err) {
    result.errors.push(
      `Import failed: ${err instanceof Error ? err.message : String(err)}`
    )
  }

  return result
}
