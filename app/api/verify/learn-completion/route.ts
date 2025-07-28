import { type NextRequest, NextResponse } from "next/server"
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

export async function POST(request: NextRequest) {
  try {
    const { taskId, answers, isCorrect, quizData } = await request.json()

    if (!taskId || !answers) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 })
    }

    // Get user session from Authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: "Missing or invalid authorization header" }, { status: 401 })
    }
    
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json({ error: "User not authenticated" }, { status: 401 })
    }

    // Get task details
    const { data: task, error: taskError } = await supabaseAdmin.from("tasks").select("*").eq("id", taskId).single()

    if (taskError || !task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 })
    }

    // Calculate if the answer is correct based on the new quiz system
    let passed = false;
    let score = 0;
    let correctAnswers = 0;
    let totalQuestions = 1;
    const passingScore = task.learn_passing_score || 80;

    if (quizData) {
      const correctAnswer = quizData.correctAnswer;
      const isMultiSelect = quizData.isMultiSelect;
      
      if (isMultiSelect) {
        // For multi-select, check if all correct answers are selected and no incorrect ones
        // For now, we'll treat it as single correct answer until we implement multi-select properly
        passed = answers.length === 1 && answers[0] === correctAnswer;
      } else {
        // For single-select, the selected answer must be correct
        passed = answers.length === 1 && answers[0] === correctAnswer;
      }
      
      score = passed ? 100 : 0;
      correctAnswers = passed ? 1 : 0;
    } else if (typeof isCorrect !== 'undefined') {
      // Fallback to the old system if quizData is not provided
      passed = isCorrect;
      score = passed ? 100 : 0;
      correctAnswers = passed ? 1 : 0;
    }

    // Create task submission
    const { error: submissionError } = await supabaseAdmin.from("user_task_submissions").upsert({
      user_id: user.id,
      task_id: taskId,
      quest_id: task.quest_id,
      status: passed ? "verified" : "rejected",
      submission_data: {
        answers,
        score,
        correctAnswers,
        totalQuestions,
        submitted_at: new Date().toISOString(),
      },
      verification_data: {
        method: "quiz",
        score,
        passingScore,
        passed,
        verified_at: new Date().toISOString(),
      },
      xp_earned: passed ? task.xp_reward : 0,
      verified_at: passed ? new Date().toISOString() : null,
      verifier_notes: `Score: ${score}% (${correctAnswers}/${totalQuestions} correct)`,
    })

    if (submissionError) {
      throw submissionError
    }

    // Update user XP if passed
    if (passed && user.wallet_address) {
      const { error: xpError } = await supabaseAdmin.rpc("increment_user_xp", {
        user_wallet: user.wallet_address.toLowerCase(),
        xp_amount: task.xp_reward,
      })

      if (xpError) {
        console.error("XP update error:", xpError)
      }
    }

    return NextResponse.json({
      success: passed,
      verified: passed,
      message: passed
        ? `Quiz completed! Score: ${score}% - You earned ${task.xp_reward} XP`
        : `Quiz failed. Score: ${score}% (Required: ${passingScore}%)`,
      xpEarned: passed ? task.xp_reward : 0,
      score,
      correctAnswers,
      totalQuestions,
      submission: {
        user_id: user.id,
        task_id: taskId,
        quest_id: task.quest_id,
        status: passed ? "verified" : "rejected",
        xp_earned: passed ? task.xp_reward : 0,
      }
    })
  } catch (error) {
    console.error("Learn completion error:", error)
    return NextResponse.json({ error: "Quiz submission failed" }, { status: 500 })
  }
}
