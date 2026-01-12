import type {
  DMNModel,
  Decision,
  BusinessKnowledgeModel,
  InputData,
  Context,
  LiteralExpression,
  Constant,
} from '../../../types/dmn'

// Escape XML special characters
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

// Generate XML for an InputData element
function generateInputDataXml(input: InputData): string {
  return `  <inputData id="${escapeXml(input.id)}" name="${escapeXml(input.name)}">
    <variable name="${escapeXml(input.name)}" typeRef="${input.typeRef}"/>
  </inputData>`
}

// Generate XML for a LiteralExpression
function generateLiteralExpressionXml(
  expression: LiteralExpression,
  indent: string = '    '
): string {
  return `${indent}<literalExpression>
${indent}  <text>${escapeXml(expression.text)}</text>
${indent}</literalExpression>`
}

// Generate XML for a Context (used in BKMs)
function generateContextXml(context: Context, indent: string = '    '): string {
  const entries = context.contextEntries
    .map(
      (entry) => `${indent}  <contextEntry>
${indent}    <variable name="${escapeXml(entry.variable.name)}" typeRef="${entry.variable.typeRef}"/>
${generateLiteralExpressionXml(entry.expression, indent + '    ')}
${indent}  </contextEntry>`
    )
    .join('\n')

  return `${indent}<context>
${entries}
${indent}</context>`
}

// Generate XML for a Constant (exported as a BKM with no parameters)
function generateConstantXml(constant: Constant): string {
  const typeRef = constant.type === 'number' ? 'number' : constant.type === 'boolean' ? 'boolean' : 'string'
  const valueText = constant.type === 'string' ? `"${escapeXml(String(constant.value))}"` : String(constant.value)

  const descriptionAttr = constant.description
    ? `\n    <description>${escapeXml(constant.description)}</description>`
    : ''

  return `  <businessKnowledgeModel id="${escapeXml(constant.id)}" name="${escapeXml(constant.name)}">${descriptionAttr}
    <variable name="${escapeXml(constant.name)}" typeRef="${typeRef}"/>
    <encapsulatedLogic>
      <literalExpression>
        <text>${valueText}</text>
      </literalExpression>
    </encapsulatedLogic>
  </businessKnowledgeModel>`
}

// Generate XML for a BusinessKnowledgeModel
function generateBKMXml(bkm: BusinessKnowledgeModel): string {
  const params = bkm.parameters
    .map(
      (p) =>
        `      <formalParameter name="${escapeXml(p.name)}" typeRef="${p.typeRef}"/>`
    )
    .join('\n')

  let expressionXml: string
  if (bkm.expressionType === 'context' && 'contextEntries' in bkm.expression) {
    expressionXml = generateContextXml(bkm.expression as Context, '      ')
  } else {
    expressionXml = generateLiteralExpressionXml(
      bkm.expression as LiteralExpression,
      '      '
    )
  }

  return `  <businessKnowledgeModel id="${escapeXml(bkm.id)}" name="${escapeXml(bkm.name)}">
    <variable name="${escapeXml(bkm.variable.name)}" typeRef="${bkm.variable.typeRef}"/>
    <encapsulatedLogic>
${params}
${expressionXml}
    </encapsulatedLogic>
  </businessKnowledgeModel>`
}

// Generate XML for a Decision
function generateDecisionXml(decision: Decision): string {
  // Generate information requirements
  const infoReqs = decision.informationRequirements
    .map((req) => {
      const tag = req.type === 'input' ? 'requiredInput' : 'requiredDecision'
      return `    <informationRequirement>
      <${tag} href="#${escapeXml(req.href)}"/>
    </informationRequirement>`
    })
    .join('\n')

  // Generate knowledge requirements
  const knowReqs = decision.knowledgeRequirements
    .map(
      (req) =>
        `    <knowledgeRequirement>
      <requiredKnowledge href="#${escapeXml(req.href)}"/>
    </knowledgeRequirement>`
    )
    .join('\n')

  const requirements = [infoReqs, knowReqs].filter((r) => r).join('\n')

  return `  <decision id="${escapeXml(decision.id)}" name="${escapeXml(decision.name)}">
    <variable name="${escapeXml(decision.variable.name)}" typeRef="${decision.variable.typeRef}"/>
${requirements}
${generateLiteralExpressionXml(decision.expression)}
  </decision>`
}

// Main export function
export function exportToDMN(model: DMNModel): string {
  const inputs = model.inputs.map(generateInputDataXml).join('\n\n')
  const constants = model.constants.map(generateConstantXml).join('\n\n')
  const bkms = model.businessKnowledgeModels.map(generateBKMXml).join('\n\n')
  const decisions = model.decisions.map(generateDecisionXml).join('\n\n')

  // Combine constants and BKMs (constants are exported as BKMs for FEEL compatibility)
  const allBkms = [constants, bkms].filter((s) => s).join('\n\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="https://www.omg.org/spec/DMN/20191111/MODEL/"
             xmlns:dmndi="https://www.omg.org/spec/DMN/20191111/DMNDI/"
             xmlns:dc="http://www.omg.org/spec/DMN/20180521/DC/"
             xmlns:di="http://www.omg.org/spec/DMN/20180521/DI/"
             xmlns:feel="https://www.omg.org/spec/DMN/20191111/FEEL/"
             id="${escapeXml(model.id)}"
             name="${escapeXml(model.name)}"
             namespace="${escapeXml(model.namespace)}">

  <!-- INPUT DATA -->
${inputs}

  <!-- BUSINESS KNOWLEDGE MODELS (includes constants) -->
${allBkms}

  <!-- DECISIONS -->
${decisions}

</definitions>`
}

// Import from JSON (simple, just parse and validate)
export function importFromJSON(json: string): DMNModel {
  const parsed = JSON.parse(json)

  // Basic validation
  if (!parsed.id || !parsed.name || !parsed.namespace) {
    throw new Error('Invalid DMN model: missing required fields')
  }

  if (!Array.isArray(parsed.inputs) || !Array.isArray(parsed.decisions)) {
    throw new Error('Invalid DMN model: inputs and decisions must be arrays')
  }

  return parsed as DMNModel
}
