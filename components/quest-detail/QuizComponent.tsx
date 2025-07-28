"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CheckCircle, XCircle, BookOpen, AlertTriangle, CheckCircle2 } from "lucide-react"
import { Task } from "./types"
import { supabase } from '@/lib/supabase'

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
        <Alert variant="destructive" className="bg-red-900/20 border-red-800 text-red-200">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Quiz Configuration Issue</AlertTitle>
          <AlertDescription>
            {!question ? 'Question is missing.' : 
             answers.length === 0 ? 'No answer options provided.' : 
             correctAnswer === null ? 'Correct answer not set.' : 
             'Quiz not properly configured.'}
            <br />
            <span className="text-xs text-red-300">Please contact an administrator to fix this quiz configuration.</span>
          </AlertDescription>
        </Alert>
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
      // Get current session for authentication
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError || !session) {
        setMessage("Authentication required. Please sign in again.")
        return
      }

      const response = await fetch('/api/verify/learn-completion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        credentials: 'include',
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
        {/* Success Alert for Quiz Completion */}
        {isCorrect && (
          <Alert className="bg-green-900/20 border-green-800 text-green-200">
            <CheckCircle2 className="h-4 w-4 text-green-400" />
            <AlertTitle>Quiz Completed!</AlertTitle>
            <AlertDescription>
              {message}
            </AlertDescription>
          </Alert>
        )}

        {/* Failure Alert for Quiz Failure */}
        {!isCorrect && (
          <Alert variant="destructive" className="bg-red-900/20 border-red-800 text-red-200">
            <XCircle className="h-4 w-4 text-red-400" />
            <AlertTitle>Quiz Failed</AlertTitle>
            <AlertDescription>
              {message}
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          <h4 className="font-semibold text-gray-200">Question Review:</h4>
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="pt-4">
              <p className="font-medium mb-2 text-gray-200">{question}</p>
              <div className="space-y-2">
                {answers.map((answer, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-lg border transition-colors ${
                      selectedAnswers.includes(index)
                        ? index === correctAnswer
                          ? 'bg-green-900/30 border-green-600 text-green-200'
                          : 'bg-red-900/30 border-red-600 text-red-200'
                        : index === correctAnswer
                        ? 'bg-green-900/30 border-green-600 text-green-200'
                        : 'bg-gray-700 border-gray-600 text-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span>{answer}</span>
                      {index === correctAnswer && (
                        <CheckCircle className="w-4 h-4 text-green-400" />
                      )}
                      {selectedAnswers.includes(index) && index !== correctAnswer && (
                        <XCircle className="w-4 h-4 text-red-400" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-center gap-2">
          {!isCorrect && (
            <Button 
              onClick={() => {
                setSelectedAnswers([])
                setShowResults(false)
                setMessage("")
              }} 
              variant="outline"
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              Try Again
            </Button>
          )}
          {isCorrect && (
            <Button 
              onClick={handleComplete} 
              className="bg-green-600 hover:bg-green-700 text-white"
            >
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
          <span className="font-medium text-gray-200">Quiz</span>
        </div>
        <Badge variant="outline" className="border-gray-600 text-gray-300">
          {isMultiSelect ? 'Multi-select' : 'Single-select'}
        </Badge>
      </div>

      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-lg text-gray-200">Answer the questions to complete this task.</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {answers.map((answer, index) => (
              <button
                key={index}
                onClick={() => handleAnswerToggle(index)}
                className={`w-full p-3 text-left rounded-lg border transition-colors ${
                  selectedAnswers.includes(index)
                    ? 'bg-green-600/20 border-green-500 text-green-200'
                    : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {answer}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {message && (
        <Alert variant="destructive" className="bg-red-900/20 border-red-800 text-red-200">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}

      <div className="flex justify-center">
        <Button 
          onClick={handleSubmit}
          disabled={isSubmitting || selectedAnswers.length === 0}
          className="bg-green-600 hover:bg-green-700 text-white"
        >
          {isSubmitting ? 'Submitting...' : 'Submit Answer'}
        </Button>
      </div>
    </div>
  )
} 