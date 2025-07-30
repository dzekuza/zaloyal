import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { createServerClient } from '@/lib/supabase-server'

// Initialize Google AI
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!)

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

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient(request)
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { message, messages, currentProject, userProjects } = body

    // Check if user owns any projects
    if (!userProjects || userProjects.length === 0) {
      return NextResponse.json({
        response: "I notice you don't have any projects yet. To create quests, you'll need to create a project first. You can do this from your dashboard. Once you have a project, I'll be happy to help you create engaging quests for it!"
      })
    }

    // Initialize the model
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })

    // Create the conversation history
    const conversationHistory = messages.map((msg: Message) => ({
      role: msg.role,
      parts: [{ text: msg.content }]
    }))

    // Create the system prompt
    const systemPrompt = `You are an AI assistant helping project owners create engaging quests with tasks for their Web3 projects. 

Your role is to:
1. Guide users through the quest creation process
2. Ask relevant questions to understand their goals
3. Suggest appropriate task types and configurations
4. Generate a complete quest plan with tasks when ready

Available task types:
- social_follow: Follow social media accounts
- social_like: Like social media posts
- social_share: Share social media posts
- social_comment: Comment on social media posts
- download: Download files/resources
- form: Fill out forms
- visit: Visit websites for a duration
- learn: Educational content with quiz
- quiz: Standalone quiz questions
- manual: Manual verification tasks

When the user is ready to create a quest, generate a JSON response with this structure:
{
  "questPlan": {
    "title": "Quest Title",
    "description": "Quest description",
    "category": "category",
    "difficulty": "easy|medium|hard",
    "xpReward": total_xp,
    "tasks": [
      {
        "type": "task_type",
        "title": "Task title",
        "description": "Task description",
        "xpReward": task_xp,
        "required": true/false,
        "orderIndex": 1,
        // Additional fields based on task type
      }
    ]
  }
}

Be conversational, helpful, and guide the user through the process step by step.`

    // Create the chat session
    const chat = model.startChat({
      history: conversationHistory,
      generationConfig: {
        maxOutputTokens: 2048,
        temperature: 0.7,
      },
    })

    // Send the message with context
    const prompt = `${systemPrompt}

Current context:
- User has ${userProjects.length} project(s)
- Current selected project: ${currentProject ? currentProject.name : 'None selected'}
- User message: ${message}

Please respond appropriately based on the conversation history and current context.`

    const result = await chat.sendMessage(prompt)
    const response = await result.response
    const text = response.text()

    // Check if the response contains a quest plan
    let questPlan: QuestPlan | null = null
    
    try {
      // Look for JSON in the response
      const jsonMatch = text.match(/\{[\s\S]*"questPlan"[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        if (parsed.questPlan) {
          questPlan = parsed.questPlan
        }
      }
    } catch (error) {
      console.log('No quest plan found in response or invalid JSON')
    }

    return NextResponse.json({
      response: text,
      questPlan
    })

  } catch (error) {
    console.error('AI Chat Error:', error)
    return NextResponse.json(
      { error: 'Failed to process AI request' },
      { status: 500 }
    )
  }
}