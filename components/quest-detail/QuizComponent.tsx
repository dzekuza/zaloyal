"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, XCircle, BookOpen } from "lucide-react"
import { Task } from "./types"

interface QuizComponentProps {
  task?: Task | null
  onComplete: () => void
}

export default function QuizComponent({ task, onComplete }: QuizComponentProps) {
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [showResults, setShowResults] = useState(false)
  const [score, setScore] = useState(0)

  // Mock questions for demo - in real app, these would come from task.learn_questions
  const questions = [
    {
      question: "What is Web3?",
      options: [
        "A new version of the internet",
        "A blockchain-based internet",
        "A social media platform",
        "A gaming console"
      ],
      correct: 1
    },
    {
      question: "What is a smart contract?",
      options: [
        "A legal document",
        "A self-executing contract with code",
        "A type of cryptocurrency",
        "A blockchain transaction"
      ],
      correct: 1
    },
    {
      question: "What does NFT stand for?",
      options: [
        "Non-Fungible Token",
        "New File Type",
        "Network File Transfer",
        "Next Generation Technology"
      ],
      correct: 0
    }
  ]

  const handleAnswer = (answerIndex: number) => {
    setAnswers(prev => ({ ...prev, [currentQuestion]: answerIndex.toString() }))
  }

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(prev => prev + 1)
    } else {
      calculateScore()
      setShowResults(true)
    }
  }

  const calculateScore = () => {
    let correct = 0
    questions.forEach((q, index) => {
      if (answers[index] === q.correct.toString()) {
        correct++
      }
    })
    const calculatedScore = Math.round((correct / questions.length) * 100)
    setScore(calculatedScore)
  }

  const handleRetry = () => {
    setCurrentQuestion(0)
    setAnswers({})
    setShowResults(false)
    setScore(0)
  }

  const handleComplete = () => {
    onComplete()
  }

  if (!task) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-400">No quiz available for this task.</p>
      </div>
    )
  }

  if (showResults) {
    const passed = score >= (task.learn_passing_score || 80)
    
    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            {passed ? (
              <CheckCircle className="w-16 h-16 text-green-500" />
            ) : (
              <XCircle className="w-16 h-16 text-red-500" />
            )}
          </div>
          <h3 className="text-xl font-semibold mb-2">
            {passed ? 'Quiz Completed!' : 'Quiz Failed'}
          </h3>
          <p className="text-gray-600 mb-4">
            Your score: {score}% (Required: {task.learn_passing_score || 80}%)
          </p>
          <Badge variant={passed ? "default" : "destructive"} className="mb-4">
            {passed ? 'PASSED' : 'FAILED'}
          </Badge>
        </div>

        <div className="space-y-4">
          <h4 className="font-semibold">Question Review:</h4>
          {questions.map((q, index) => (
            <Card key={index} className="border-l-4 border-l-gray-200">
              <CardContent className="pt-4">
                <p className="font-medium mb-2">{q.question}</p>
                <div className="space-y-2">
                  {q.options.map((option, optionIndex) => (
                    <div
                      key={optionIndex}
                      className={`p-2 rounded ${
                        answers[index] === optionIndex.toString()
                          ? optionIndex === q.correct
                            ? 'bg-green-100 border border-green-300'
                            : 'bg-red-100 border border-red-300'
                          : optionIndex === q.correct
                          ? 'bg-green-100 border border-green-300'
                          : 'bg-gray-50'
                      }`}
                    >
                      {option}
                      {optionIndex === q.correct && (
                        <CheckCircle className="w-4 h-4 text-green-600 inline ml-2" />
                      )}
                      {answers[index] === optionIndex.toString() && optionIndex !== q.correct && (
                        <XCircle className="w-4 h-4 text-red-600 inline ml-2" />
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex justify-center gap-2">
          {!passed && (
            <Button onClick={handleRetry} variant="outline">
              Retry Quiz
            </Button>
          )}
          {passed && (
            <Button onClick={handleComplete} className="bg-green-600 hover:bg-green-700">
              Complete Task
            </Button>
          )}
        </div>
      </div>
    )
  }

  const currentQ = questions[currentQuestion]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-blue-500" />
          <span className="font-medium">Quiz</span>
        </div>
        <Badge variant="outline">
          Question {currentQuestion + 1} of {questions.length}
        </Badge>
      </div>

      {task.learn_content && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-4">
            <h4 className="font-medium mb-2">Learning Content:</h4>
            <p className="text-sm text-gray-700">{task.learn_content}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{currentQ.question}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {currentQ.options.map((option, index) => (
              <button
                key={index}
                onClick={() => handleAnswer(index)}
                className={`w-full p-3 text-left rounded-lg border transition-colors ${
                  answers[currentQuestion] === index.toString()
                    ? 'bg-blue-100 border-blue-300'
                    : 'bg-white border-gray-200 hover:bg-gray-50'
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button
          onClick={() => setCurrentQuestion(prev => Math.max(0, prev - 1))}
          disabled={currentQuestion === 0}
          variant="outline"
        >
          Previous
        </Button>
        <Button
          onClick={handleNext}
          disabled={!answers[currentQuestion]}
        >
          {currentQuestion === questions.length - 1 ? 'Finish Quiz' : 'Next'}
        </Button>
      </div>
    </div>
  )
} 