import type { DMNModel } from '../../types/dmn'
import type { DMNEngine, ExecutionResult, DecisionResult } from './types'
import { exportToDMN } from '../../features/editor/utils/dmn-export'

// Response types from Extended Services
interface JITDMNDecisionResult {
  decisionId: string
  decisionName: string
  result: unknown
  messages: Array<{ message: string; severity: string }>
  evaluationStatus: 'SUCCEEDED' | 'FAILED' | 'SKIPPED'
}

interface JITDMNResult {
  namespace: string
  modelName: string
  dmnContext: Record<string, unknown>
  messages: Array<{ message: string; severity: string; sourceId?: string }>
  decisionResults: JITDMNDecisionResult[]
}

// Default URL for Extended Services
const DEFAULT_BASE_URL = 'http://localhost:21345'

// Use Vite proxy in development to bypass CORS
const USE_PROXY = import.meta.env.DEV
const PROXY_PATH = '/kie-proxy'

// Engine configuration interface
export interface ExtendedServicesConfig {
  host: string
  port: number
}

export const DEFAULT_EXTENDED_SERVICES_CONFIG: ExtendedServicesConfig = {
  host: 'localhost',
  port: 21345,
}

// ExtendedServicesEngine implementation
export class ExtendedServicesEngine implements DMNEngine {
  id = 'extended-services' as const
  name = 'KIE Extended Services'
  description =
    'Full DMN engine via KIE Extended Services. Requires local service running.'
  requiresConnection = true

  private baseUrl: string
  private directUrl: string // Store the actual URL for display purposes

  constructor(baseUrl: string = DEFAULT_BASE_URL) {
    this.directUrl = baseUrl
    // In dev mode, use the proxy to bypass CORS
    this.baseUrl = USE_PROXY ? PROXY_PATH : baseUrl
  }

  // Allow updating the URL dynamically
  setUrl(host: string, port: number): void {
    this.directUrl = `http://${host}:${port}`
    // In dev mode, always use proxy (note: proxy target is fixed in vite.config.ts)
    // For now, the proxy only works with default port. For custom ports in dev,
    // users would need to update vite.config.ts
    this.baseUrl = USE_PROXY ? PROXY_PATH : this.directUrl
  }

  getUrl(): string {
    return this.directUrl // Return the actual URL for display
  }

  async evaluate(
    model: DMNModel,
    inputs: Record<string, unknown>
  ): Promise<ExecutionResult> {
    try {
      // Convert model to DMN XML
      const dmnXml = exportToDMN(model)
      const modelFileName = `${model.name.replace(/\s+/g, '_')}.dmn`

      // Build context with input values mapped by name
      const context: Record<string, unknown> = {}
      model.inputs.forEach((input) => {
        const value = inputs[input.id] ?? inputs[input.name]
        context[input.name] = value
      })

      // Call Extended Services with MultipleResourcesPayload format
      const response = await fetch(`${this.baseUrl}/jitdmn/dmnresult`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mainURI: modelFileName,
          resources: [
            {
              URI: modelFileName,
              content: dmnXml,
            },
          ],
          context: context,
        }),
      })

      if (!response.ok) {
        // Try to get error details from response
        let errorMessage = `Extended Services returned ${response.status}`
        try {
          const errorBody = await response.json()
          if (errorBody.messages && errorBody.messages.length > 0) {
            errorMessage = errorBody.messages
              .map((m: { message: string }) => m.message)
              .join('; ')
          }
        } catch {
          // Ignore JSON parse errors
        }

        return {
          success: false,
          inputs,
          decisions: {},
          errors: [errorMessage],
        }
      }

      const result: JITDMNResult = await response.json()
      return this.mapResponse(result, inputs)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return {
        success: false,
        inputs,
        decisions: {},
        errors: [`Failed to connect to Extended Services: ${message}`],
      }
    }
  }

  async checkConnection(): Promise<boolean> {
    try {
      // Try calling the validate endpoint with the correct payload format
      const response = await fetch(`${this.baseUrl}/jitdmn/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mainURI: 'test.dmn',
          resources: [
            {
              URI: 'test.dmn',
              content: `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="https://www.omg.org/spec/DMN/20191111/MODEL/"
             id="test" name="test" namespace="test">
</definitions>`,
            },
          ],
        }),
      })
      // Any response (including validation errors) means the service is up
      return response.ok || response.status === 400
    } catch {
      return false
    }
  }

  private mapResponse(
    result: JITDMNResult,
    inputs: Record<string, unknown>
  ): ExecutionResult {
    const errors: string[] = []
    const decisions: Record<string, DecisionResult> = {}

    // Map decision results
    for (const dr of result.decisionResults) {
      decisions[dr.decisionId] = {
        decisionId: dr.decisionId,
        decisionName: dr.decisionName,
        value: dr.result,
        error:
          dr.evaluationStatus === 'FAILED'
            ? dr.messages.map((m) => m.message).join('; ') ||
              'Evaluation failed'
            : undefined,
      }

      if (dr.evaluationStatus === 'FAILED') {
        errors.push(
          `Error evaluating "${dr.decisionName}": ${dr.messages.map((m) => m.message).join('; ') || 'Unknown error'}`
        )
      }
    }

    // Add any global messages as errors
    result.messages
      .filter((m) => m.severity === 'ERROR')
      .forEach((m) => {
        errors.push(m.message)
      })

    return {
      success: errors.length === 0,
      inputs,
      decisions,
      errors,
    }
  }
}

// Singleton instance with default URL
export const extendedServicesEngine = new ExtendedServicesEngine()
