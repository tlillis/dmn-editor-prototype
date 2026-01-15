import { useState, useCallback, useMemo } from 'react'
import { useDMNStore } from '../../store/dmn-store'
import { getEngine } from '../../lib/engines'
import { QuestionCard } from './components/question-card'
import { ResultCard } from './components/result-card'
import { Button } from '../../components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../../components/ui/card'
import { getQuestionOrder, findLeafDecisions } from './utils/screener-logic'
import { ArrowLeft, Play } from 'lucide-react'
import { Link } from '@tanstack/react-router'

type ScreenerState = 'intro' | 'questions' | 'evaluating' | 'result'

export function ScreenerPage() {
  const { model, selectedEngineId } = useDMNStore()

  const [state, setState] = useState<ScreenerState>('intro')
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, unknown>>({})
  const [decisionResults, setDecisionResults] = useState<
    Record<string, { value: unknown; error?: string }>
  >({})

  // Get questions in model order
  const questions = useMemo(() => getQuestionOrder(model), [model])
  const leafDecisions = useMemo(() => findLeafDecisions(model), [model])

  const currentQuestion = questions[currentQuestionIndex]

  // Evaluate the model with all answers (called once at the end)
  const evaluateModel = useCallback(
    async (allAnswers: Record<string, unknown>) => {
      setState('evaluating')
      try {
        const engine = getEngine(selectedEngineId)

        // Map answers by input name for the engine
        const inputValues: Record<string, unknown> = {}
        for (const input of model.inputs) {
          if (allAnswers[input.id] !== undefined) {
            inputValues[input.id] = allAnswers[input.id]
            inputValues[input.name] = allAnswers[input.id]
          }
        }

        const result = await engine.evaluate(model, inputValues)

        // Extract decision results
        const newDecisionResults: Record<
          string,
          { value: unknown; error?: string }
        > = {}
        for (const [decisionId, decisionResult] of Object.entries(
          result.decisions
        )) {
          newDecisionResults[decisionId] = {
            value: decisionResult.value,
            error: decisionResult.error,
          }
        }

        setDecisionResults(newDecisionResults)
        setState('result')
      } catch (error) {
        console.error('Evaluation error:', error)
        setState('result')
      }
    },
    [model, selectedEngineId]
  )

  // Handle answer submission
  const handleAnswer = useCallback(
    async (value: unknown) => {
      if (!currentQuestion) return

      const newAnswers = { ...answers, [currentQuestion.id]: value }
      setAnswers(newAnswers)

      // Move to next question or evaluate
      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex(currentQuestionIndex + 1)
      } else {
        // All questions answered - evaluate the model
        await evaluateModel(newAnswers)
      }
    },
    [
      currentQuestion,
      answers,
      currentQuestionIndex,
      questions.length,
      evaluateModel,
    ]
  )

  // Go back to previous question
  const handleBack = useCallback(() => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1)
    }
  }, [currentQuestionIndex])

  // Restart the screener
  const handleRestart = useCallback(() => {
    setState('intro')
    setCurrentQuestionIndex(0)
    setAnswers({})
    setDecisionResults({})
  }, [])

  // Start the screener
  const handleStart = useCallback(() => {
    setState('questions')
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Editor
            </Button>
          </Link>
          <span className="text-sm text-muted-foreground">{model.name}</span>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-2xl mx-auto px-4 py-8">
        {/* Intro state */}
        {state === 'intro' && (
          <Card className="w-full max-w-lg mx-auto">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">{model.name}</CardTitle>
              {model.description && (
                <p className="text-muted-foreground mt-2">
                  {model.description}
                </p>
              )}
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center text-sm text-muted-foreground">
                <p>Answer a few questions to check your eligibility.</p>
                <p className="mt-2">
                  This screener has{' '}
                  <span className="font-medium">
                    {questions.length} questions
                  </span>
                  .
                </p>
              </div>

              {/* Quick stats */}
              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="bg-muted rounded-lg p-3">
                  <p className="text-2xl font-bold">{questions.length}</p>
                  <p className="text-xs text-muted-foreground">Questions</p>
                </div>
                <div className="bg-muted rounded-lg p-3">
                  <p className="text-2xl font-bold">{leafDecisions.length}</p>
                  <p className="text-xs text-muted-foreground">Outcomes</p>
                </div>
              </div>

              <Button className="w-full h-12 text-lg" onClick={handleStart}>
                <Play className="h-5 w-5 mr-2" />
                Start Screening
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                Your answers are not saved and this is for informational
                purposes only.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Questions state */}
        {state === 'questions' && currentQuestion && (
          <div className="space-y-4">
            {/* Progress bar */}
            <div className="w-full max-w-lg mx-auto">
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{
                    width: `${((currentQuestionIndex + 1) / questions.length) * 100}%`,
                  }}
                />
              </div>
            </div>

            <QuestionCard
              input={currentQuestion}
              questionNumber={currentQuestionIndex + 1}
              totalQuestions={questions.length}
              onAnswer={handleAnswer}
              onBack={handleBack}
              canGoBack={currentQuestionIndex > 0}
            />
          </div>
        )}

        {/* Evaluating state */}
        {state === 'evaluating' && (
          <Card className="w-full max-w-lg mx-auto">
            <CardContent className="py-12 text-center">
              <div className="animate-pulse">
                <p className="text-lg font-medium">Calculating results...</p>
                <p className="text-sm text-muted-foreground mt-2">
                  This will only take a moment.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Result state */}
        {state === 'result' && (
          <ResultCard
            model={model}
            answers={answers}
            decisionResults={decisionResults}
            onRestart={handleRestart}
          />
        )}
      </main>
    </div>
  )
}
