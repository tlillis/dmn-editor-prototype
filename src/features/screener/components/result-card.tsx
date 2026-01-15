import type { DMNModel } from '../../../types/dmn'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../../../components/ui/card'
import { Button } from '../../../components/ui/button'
import { Badge } from '../../../components/ui/badge'
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { formatValue, findLeafDecisions } from '../utils/screener-logic'

interface ResultCardProps {
  model: DMNModel
  answers: Record<string, unknown>
  decisionResults: Record<string, { value: unknown; error?: string }>
  onRestart: () => void
}

export function ResultCard({
  model,
  answers,
  decisionResults,
  onRestart,
}: ResultCardProps) {
  const leafDecisions = findLeafDecisions(model)

  // Determine the primary outcome (boolean that determines eligibility)
  // First try boolean leaf decisions, then fall back to any decision with "Eligible" in name
  let primaryDecision = leafDecisions.find(
    (d) => d.variable.typeRef === 'boolean'
  )
  if (!primaryDecision) {
    // No boolean leaf - look for eligibility decision by name pattern
    primaryDecision = model.decisions.find(
      (d) => d.variable.typeRef === 'boolean' && /eligible/i.test(d.name)
    )
  }
  const primaryResult = primaryDecision
    ? decisionResults[primaryDecision.id]
    : null
  const isEligible = primaryResult?.value === true
  const isIneligible = primaryResult?.value === false

  // Find any numeric outcomes (like benefit amounts)
  const numericOutcomes = leafDecisions.filter(
    (d) =>
      d.variable.typeRef === 'number' &&
      decisionResults[d.id]?.value !== undefined &&
      decisionResults[d.id]?.value !== null
  )

  // Get answered inputs for summary
  const answeredInputs = model.inputs.filter(
    (input) => answers[input.id] !== undefined
  )

  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader className="text-center">
        {/* Main outcome indicator */}
        {isEligible ? (
          <>
            <div className="flex justify-center mb-4">
              <CheckCircle className="h-16 w-16 text-green-500" />
            </div>
            <CardTitle className="text-2xl text-green-700">
              You May Be Eligible!
            </CardTitle>
            <p className="text-muted-foreground mt-2">
              Based on your answers, you appear to meet the requirements.
            </p>
          </>
        ) : isIneligible ? (
          <>
            <div className="flex justify-center mb-4">
              <XCircle className="h-16 w-16 text-red-500" />
            </div>
            <CardTitle className="text-2xl text-red-700">
              Not Eligible
            </CardTitle>
            <p className="text-muted-foreground mt-2">
              Based on your answers, you do not meet the requirements.
            </p>
          </>
        ) : (
          <>
            <div className="flex justify-center mb-4">
              <AlertCircle className="h-16 w-16 text-yellow-500" />
            </div>
            <CardTitle className="text-2xl">Results</CardTitle>
            <p className="text-muted-foreground mt-2">
              Review your results below.
            </p>
          </>
        )}
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Numeric outcomes (like benefit amount) */}
        {numericOutcomes.length > 0 && isEligible && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            {numericOutcomes.map((decision) => (
              <div key={decision.id} className="text-center">
                <p className="text-sm text-green-700">{decision.name}</p>
                <p className="text-3xl font-bold text-green-800">
                  ${formatValue(decisionResults[decision.id]?.value)}
                </p>
                <p className="text-xs text-green-600 mt-1">
                  per month (estimated)
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Summary of key decisions */}
        <div>
          <h3 className="text-sm font-medium mb-3">Decision Summary</h3>
          <div className="space-y-2">
            {Object.entries(decisionResults)
              .filter(
                ([, result]) =>
                  result.value !== undefined && result.value !== null
              )
              .slice(0, 10)
              .map(([decisionId, result]) => {
                const decision = model.decisions.find(
                  (d) => d.id === decisionId
                )
                if (!decision) return null

                const isBoolean = typeof result.value === 'boolean'
                const isPassing = result.value === true

                return (
                  <div
                    key={decisionId}
                    className="flex justify-between items-center text-sm py-1"
                  >
                    <span className="text-muted-foreground truncate mr-2">
                      {decision.name}
                    </span>
                    {isBoolean ? (
                      <Badge variant={isPassing ? 'default' : 'destructive'}>
                        {isPassing ? 'Yes' : 'No'}
                      </Badge>
                    ) : (
                      <span className="font-medium">
                        {formatValue(result.value)}
                      </span>
                    )}
                  </div>
                )
              })}
          </div>
        </div>

        {/* Answers summary (collapsible) */}
        <details className="text-sm">
          <summary className="cursor-pointer font-medium text-muted-foreground hover:text-foreground">
            Your Answers ({answeredInputs.length} questions)
          </summary>
          <div className="mt-3 space-y-1 pl-2 border-l-2 border-muted">
            {answeredInputs.map((input) => (
              <div key={input.id} className="flex justify-between py-1">
                <span className="text-muted-foreground">{input.name}</span>
                <span className="font-medium">
                  {formatValue(answers[input.id])}
                </span>
              </div>
            ))}
          </div>
        </details>

        {/* Restart button */}
        <Button className="w-full" onClick={onRestart}>
          Start Over
        </Button>

        {/* Disclaimer */}
        <p className="text-xs text-muted-foreground text-center">
          This is an estimate only. Actual eligibility is determined by the
          administering agency.
        </p>
      </CardContent>
    </Card>
  )
}
