import type { InputData } from '../../../types/dmn'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../../../components/ui/card'
import { generateQuestionText } from '../utils/screener-logic'
import { useState } from 'react'

interface QuestionCardProps {
  input: InputData
  questionNumber: number
  totalQuestions: number
  onAnswer: (value: unknown) => void
  onBack?: () => void
  canGoBack: boolean
}

export function QuestionCard({
  input,
  questionNumber,
  totalQuestions,
  onAnswer,
  onBack,
  canGoBack,
}: QuestionCardProps) {
  const [numberValue, setNumberValue] = useState<string>('')
  const [stringValue, setStringValue] = useState<string>('')

  const questionText = generateQuestionText(input)

  const handleNumberSubmit = () => {
    const num = parseFloat(numberValue)
    if (!isNaN(num)) {
      onAnswer(num)
    }
  }

  const handleStringSubmit = () => {
    if (stringValue.trim()) {
      onAnswer(stringValue.trim())
    }
  }

  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader>
        <div className="flex justify-between items-center text-sm text-muted-foreground mb-2">
          <span>
            Question {questionNumber} of {totalQuestions}
          </span>
        </div>
        <CardTitle className="text-xl">{questionText}</CardTitle>
        {input.description && (
          <p className="text-sm text-muted-foreground mt-2">
            {input.description}
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Boolean input - Yes/No buttons */}
        {input.typeRef === 'boolean' && (
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1 h-12 text-lg"
              onClick={() => onAnswer(true)}
            >
              Yes
            </Button>
            <Button
              variant="outline"
              className="flex-1 h-12 text-lg"
              onClick={() => onAnswer(false)}
            >
              No
            </Button>
          </div>
        )}

        {/* Number input */}
        {input.typeRef === 'number' && (
          <div className="space-y-3">
            <Input
              type="number"
              value={numberValue}
              onChange={(e) => setNumberValue(e.target.value)}
              placeholder="Enter a number"
              className="h-12 text-lg"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleNumberSubmit()
              }}
            />
            <Button
              className="w-full h-12"
              onClick={handleNumberSubmit}
              disabled={!numberValue || isNaN(parseFloat(numberValue))}
            >
              Continue
            </Button>
          </div>
        )}

        {/* String input */}
        {input.typeRef === 'string' && (
          <div className="space-y-3">
            <Input
              type="text"
              value={stringValue}
              onChange={(e) => setStringValue(e.target.value)}
              placeholder="Enter your answer"
              className="h-12 text-lg"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleStringSubmit()
              }}
            />
            <Button
              className="w-full h-12"
              onClick={handleStringSubmit}
              disabled={!stringValue.trim()}
            >
              Continue
            </Button>
          </div>
        )}

        {/* Back button */}
        {canGoBack && (
          <Button variant="ghost" className="w-full mt-2" onClick={onBack}>
            Go Back
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
