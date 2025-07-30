"use client"

import React, { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/components/auth-provider-wrapper'
import { supabase } from '@/lib/supabase'
import { MessageCircle, X, Send, Bot, User, CheckCircle, AlertCircle } from 'lucide-react'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface QuestPlan {
  title: string
  description: string
  category: string
  difficulty: string
  xpReward: number
  tasks: TaskPlan[]
}

interface TaskPlan {
  type: string
  title: string
  description: string
  xpReward: number
  required: boolean
  orderIndex: number
  // Task-specific fields
  socialPlatform?: string
  socialAction?: string
  socialUrl?: string
  socialUsername?: string
  downloadUrl?: string
  downloadTitle?: string
  formUrl?: string
  formTitle?: string
  visitUrl?: string
  visitTitle?: string
  visitDurationSeconds?: number
  learnContent?: string
  quizQuestion?: string
  quizAnswers?: string[]
  quizCorrectAnswer?: number
}

export default function AIQuestChat() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [currentProject, setCurrentProject] = useState<any>(null)
  const [userProjects, setUserProjects] = useState<any[]>([])
  const [questPlan, setQuestPlan] = useState<QuestPlan | null>(null)
  const [showPlanReview, setShowPlanReview] = useState(false)
  const [isCreatingQuest, setIsCreatingQuest] = useState(false)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()
  const { user } = useAuth()

  useEffect(() => {
    if (isOpen && user) {
      loadUserProjects()
      initializeChat()
    }
  }, [isOpen, user])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const loadUserProjects = async () => {
    if (!user) return

    try {
      const { data: projects, error } = await supabase
        .from('projects')
        .select('*')
        .eq('owner_id', user.id)

      if (error) {
        console.error('Error loading projects:', error)
        return
      }

      setUserProjects(projects || [])
    } catch (error) {
      console.error('Error loading projects:', error)
    }
  }

  const initializeChat = () => {
    const welcomeMessage: Message = {
      id: Date.now().toString(),
      role: 'assistant',
      content: `Hello! I'm your AI assistant, and I'm here to help you create engaging quests with tasks for your project. 

To get started, I'll need to know a few things:
1. Which project would you like to create a quest for?
2. What type of quest are you thinking about?
3. What's the main goal or theme of this quest?

Let me know your project and I'll guide you through creating an amazing quest!`,
      timestamp: new Date()
    }

    setMessages([welcomeMessage])
  }

  const sendMessage = async () => {
    if (!inputValue.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/ai-quest-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: inputValue,
          messages: messages,
          currentProject,
          userProjects
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to get AI response')
      }

      const data = await response.json()
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response,
        timestamp: new Date()
      }

      setMessages(prev => [...prev, assistantMessage])

      // If the AI has generated a quest plan, show it for review
      if (data.questPlan) {
        setQuestPlan(data.questPlan)
        setShowPlanReview(true)
      }
    } catch (error) {
      console.error('Error sending message:', error)
      toast({
        title: "Error",
        description: "Failed to get AI response. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const createQuestWithTasks = async () => {
    if (!questPlan || !currentProject || !user) return

    setIsCreatingQuest(true)

    try {
      // Create the quest
      const { data: quest, error: questError } = await supabase
        .from('quests')
        .insert({
          title: questPlan.title,
          description: questPlan.description,
          category: questPlan.category,
          difficulty: questPlan.difficulty,
          xp_reward: questPlan.xpReward,
          total_xp: questPlan.xpReward,
          status: 'active',
          project_id: currentProject.id,
          created_by: user.id
        })
        .select()
        .single()

      if (questError) {
        throw new Error(`Failed to create quest: ${questError.message}`)
      }

      // Create tasks for the quest
      for (const taskPlan of questPlan.tasks) {
        const { error: taskError } = await supabase
          .from('tasks')
          .insert({
            quest_id: quest.id,
            type: taskPlan.type,
            title: taskPlan.title,
            description: taskPlan.description,
            xp_reward: taskPlan.xpReward,
            status: 'active',
            required: taskPlan.required,
            order_index: taskPlan.orderIndex,
            // Task-specific fields
            social_platform: taskPlan.socialPlatform,
            social_action: taskPlan.socialAction,
            social_url: taskPlan.socialUrl,
            social_username: taskPlan.socialUsername,
            download_url: taskPlan.downloadUrl,
            download_title: taskPlan.downloadTitle,
            form_url: taskPlan.formUrl,
            form_title: taskPlan.formTitle,
            visit_url: taskPlan.visitUrl,
            visit_title: taskPlan.visitTitle,
            visit_duration_seconds: taskPlan.visitDurationSeconds,
            learn_content: taskPlan.learnContent,
            quiz_question: taskPlan.quizQuestion,
            quiz_answer_1: taskPlan.quizAnswers?.[0],
            quiz_answer_2: taskPlan.quizAnswers?.[1],
            quiz_answer_3: taskPlan.quizAnswers?.[2],
            quiz_answer_4: taskPlan.quizAnswers?.[3],
            quiz_correct_answer: taskPlan.quizCorrectAnswer
          })

        if (taskError) {
          console.error('Error creating task:', taskError)
        }
      }

      toast({
        title: "Success!",
        description: `Quest "${questPlan.title}" has been created with ${questPlan.tasks.length} tasks.`,
      })

      // Reset the chat
      setQuestPlan(null)
      setShowPlanReview(false)
      setMessages([])
      initializeChat()
      setIsOpen(false)

    } catch (error) {
      console.error('Error creating quest:', error)
      toast({
        title: "Error",
        description: "Failed to create quest. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsCreatingQuest(false)
    }
  }

  const selectProject = (project: any) => {
    setCurrentProject(project)
    const projectMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: `I want to create a quest for project: ${project.name}`,
      timestamp: new Date()
    }
    setMessages(prev => [...prev, projectMessage])
  }

  return (
    <>
      {/* Fixed Floating Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button
              size="lg"
              className="h-14 w-14 rounded-full shadow-lg bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            >
              <MessageCircle className="h-6 w-6" />
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl h-[80vh] p-0">
            <DialogHeader className="p-6 border-b">
              <div className="flex items-center justify-between">
                <DialogTitle className="flex items-center gap-2">
                  <Bot className="h-5 w-5" />
                  AI Quest Creator
                </DialogTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </DialogHeader>

            <div className="flex h-full">
              {/* Chat Area */}
              <div className="flex-1 flex flex-col">
                <ScrollArea className="flex-1 p-6">
                  <div className="space-y-4">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex gap-3 ${
                          message.role === 'user' ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        <div
                          className={`flex gap-3 max-w-[80%] ${
                            message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            message.role === 'user' 
                              ? 'bg-blue-600 text-white' 
                              : 'bg-gray-200 text-gray-700'
                          }`}>
                            {message.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                          </div>
                          <div className={`rounded-lg p-3 ${
                            message.role === 'user'
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 text-gray-900'
                          }`}>
                            <div className="whitespace-pre-wrap">{message.content}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                    {isLoading && (
                      <div className="flex gap-3 justify-start">
                        <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-700 flex items-center justify-center">
                          <Bot className="h-4 w-4" />
                        </div>
                        <div className="bg-gray-100 rounded-lg p-3">
                          <div className="flex items-center gap-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                            <span className="text-gray-600">AI is thinking...</span>
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                {/* Project Selection */}
                {!currentProject && userProjects.length > 0 && (
                  <div className="p-4 border-t bg-gray-50">
                    <h3 className="text-sm font-medium mb-2">Select a project:</h3>
                    <div className="flex gap-2 flex-wrap">
                      {userProjects.map((project) => (
                        <Button
                          key={project.id}
                          variant="outline"
                          size="sm"
                          onClick={() => selectProject(project)}
                        >
                          {project.name}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Input Area */}
                <div className="p-4 border-t">
                  <div className="flex gap-2">
                    <Textarea
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Type your message..."
                      className="flex-1 resize-none"
                      rows={1}
                      disabled={isLoading}
                    />
                    <Button
                      onClick={sendMessage}
                      disabled={isLoading || !inputValue.trim()}
                      size="sm"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Quest Plan Review */}
              {showPlanReview && questPlan && (
                <div className="w-80 border-l bg-gray-50 p-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">Quest Plan Review</h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowPlanReview(false)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>

                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg">{questPlan.title}</CardTitle>
                        <div className="flex gap-2">
                          <Badge variant="secondary">{questPlan.category}</Badge>
                          <Badge variant="outline">{questPlan.difficulty}</Badge>
                          <Badge variant="default">{questPlan.xpReward} XP</Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-gray-600 mb-4">{questPlan.description}</p>
                        
                        <div className="space-y-2">
                          <h4 className="font-medium text-sm">Tasks ({questPlan.tasks.length})</h4>
                          {questPlan.tasks.map((task, index) => (
                            <div key={index} className="text-sm p-2 bg-white rounded border">
                              <div className="font-medium">{task.title}</div>
                              <div className="text-gray-600">{task.description}</div>
                              <div className="flex gap-2 mt-1">
                                <Badge variant="outline" className="text-xs">{task.type}</Badge>
                                <Badge variant="secondary" className="text-xs">{task.xpReward} XP</Badge>
                                {task.required && (
                                  <Badge variant="destructive" className="text-xs">Required</Badge>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="flex gap-2 mt-4">
                          <Button
                            onClick={createQuestWithTasks}
                            disabled={isCreatingQuest}
                            className="flex-1"
                          >
                            {isCreatingQuest ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                Creating...
                              </>
                            ) : (
                              <>
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Create Quest
                              </>
                            )}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </>
  )
}