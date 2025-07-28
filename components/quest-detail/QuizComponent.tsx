"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, XCircle, BookOpen, AlertTriangle } from "lucide-react"
import { Task } from "./types"

interface QuizComponentProps {
  task?: Task | null
  onComplete: () => void
}

export default function QuizComponent({ task, onComplete }: QuizComponentProps) {
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)
  const [message, setMessage] = useState("")

  if (!task) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-400">No quiz available for this task.</p>
      </div>
    )
  }

  // Get quiz data from task
  const question = task.quiz_question
  const answers = [
    task.quiz_answer_1,
    task.quiz_answer_2,
    task.quiz_answer_3,
    task.quiz_answer_4
  ].filter(Boolean) // Remove empty answers
  const correctAnswer = task.quiz_correct_answer
  const isMultiSelect = task.quiz_is_multi_select

  if (!question || answers.length === 0 || correctAnswer === null) {
    return (
      <div className="text-center py-8">
        <div className="space-y-4">
          <div className="flex items-center justify-center gap-2 text-yellow-400">
            <AlertTriangle className="w-5 h-5" />
            <span className="font-medium">Quiz Configuration Issue</span>
          </div>
          <p className="text-gray-400">
            {!question ? 'Question is missing.' : 
             answers.length === 0 ? 'No answer options provided.' : 
             correctAnswer === null ? 'Correct answer not set.' : 
             'Quiz not properly configured.'}
          </p>
          <p className="text-sm text-gray-500">
            Please contact an administrator to fix this quiz configuration.
          </p>
        </div>
      </div>
    )
  }

  const handleAnswerToggle = (answerIndex: number) => {
    if (isMultiSelect) {
      setSelectedAnswers(prev => 
        prev.includes(answerIndex)
          ? prev.filter(i => i !== answerIndex)
          : [...prev, answerIndex]
      )
    } else {
      setSelectedAnswers([answerIndex])
    }
  }

  const handleSubmit = async () => {
    if (selectedAnswers.length === 0) {
      setMessage("Please select an answer.")
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch('/api/verify/learn-completion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          taskId: task.id,
          answers: selectedAnswers,
          quizData: {
            correctAnswer,
            isMultiSelect,
            totalAnswers: answers.length
          }
        })
      })

      const result = await response.json()

      if (result.success) {
        setIsCorrect(result.verified)
        setMessage(result.message)
        setShowResults(true)
      } else {
        setMessage(result.message || 'Quiz submission failed')
      }
    } catch (error) {
      console.error('Quiz submission error:', error)
      setMessage('Failed to submit quiz. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleComplete = () => {
    onComplete()
  }

  if (showResults) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            {isCorrect ? (
              <CheckCircle className="w-16 h-16 text-green-500" />
            ) : (
              <XCircle className="w-16 h-16 text-red-500" />
            )}
          </div>
          <h3 className="text-xl font-semibold mb-2">
            {isCorrect ? 'Quiz Completed!' : 'Quiz Failed'}
          </h3>
          <p className="text-gray-600 mb-4">
            {message}
          </p>
          <Badge variant={isCorrect ? "default" : "destructive"} className="mb-4">
            {isCorrect ? 'PASSED' : 'FAILED'}
          </Badge>
        </div>

        <div className="space-y-4">
          <h4 className="font-semibold">Question Review:</h4>
          <Card className="border-l-4 border-l-gray-200">
            <CardContent className="pt-4">
              <p className="font-medium mb-2">{question}</p>
              <div className="space-y-2">
                {answers.map((answer, index) => (
                  <div
                    key={index}
                    className={`p-2 rounded ${
                      selectedAnswers.includes(index)
                        ? index === correctAnswer
                          ? 'bg-green-100 border border-green-300'
                          : 'bg-red-100 border border-red-300'
                        : index === correctAnswer
                        ? 'bg-green-100 border border-green-300'
                        : 'bg-gray-50'
                    }`}
                  >
                    {answer}
                    {index === correctAnswer && (
                      <CheckCircle className="w-4 h-4 text-green-600 inline ml-2" />
                    )}
                    {selectedAnswers.includes(index) && index !== correctAnswer && (
                      <XCircle className="w-4 h-4 text-red-600 inline ml-2" />
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-center gap-2">
          {!isCorrect && (
            <Button onClick={() => {
              setSelectedAnswers([])
              setShowResults(false)
              setMessage("")
            }} variant="outline">
              Try Again
            </Button>
          )}
          {isCorrect && (
            <Button onClick={handleComplete} className="bg-green-600 hover:bg-green-700">
              Complete Task
            </Button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-blue-500" />
          <span className="font-medium">Quiz</span>
        </div>
        <Badge variant="outline">
          {isMultiSelect ? 'Multi-select' : 'Single-select'}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{question}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {answers.map((answer, index) => (
              <button
                key={index}
                onClick={() => handleAnswerToggle(index)}
                className={`w-full p-3 text-left rounded-lg border transition-colors ${
                  selectedAnswers.includes(index)
                    ? 'bg-blue-100 border-blue-300'
                    : 'bg-white border-gray-200 hover:bg-gray-50'
                }`}
              >
                {answer}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {message && (
        <div className="text-red-500 text-sm text-center">
          {message}
        </div>
      )}

      <div className="flex justify-center">
        <Button 
          onClick={handleSubmit}
          disabled={isSubmitting || selectedAnswers.length === 0}
          className="bg-green-600 hover:bg-green-700"
        >
          {isSubmitting ? 'Submitting...' : 'Submit Answer'}
        </Button>
      </div>
    </div>
  )
} 