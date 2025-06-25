import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function POST(request: NextRequest) {
  try {
    const { userWallet, taskId, answers } = await request.json()

    if (!userWallet || !taskId || !answers) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 })
    }

    // Get user from database
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("wallet_address", userWallet.toLowerCase())
      .single()

    if (userError || !user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Get task details
    const { data: task, error: taskError } = await supabase.from("tasks").select("*").eq("id", taskId).single()

    if (taskError || !task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 })
    }

    // Check answers against correct answers
    const questions = task.learn_questions || []
    let correctAnswers = 0
    const totalQuestions = questions.length

    if (totalQuestions === 0) {
      return NextResponse.json({ error: "No questions found for this task" }, { status: 400 })
    }

    // Calculate score
    questions.forEach((question: any, index: number) => {
      if (answers[index] === question.correctAnswer) {
        correctAnswers++
      }
    })

    const score = Math.round((correctAnswers / totalQuestions) * 100)
    const passingScore = task.learn_passing_score || 80
    const passed = score >= passingScore

    // Create task submission
    const { error: submissionError } = await supabase.from("user_task_submissions").upsert({
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
    if (passed) {
      const { error: xpError } = await supabase.rpc("increment_user_xp", {
        user_wallet: userWallet.toLowerCase(),
        xp_amount: task.xp_reward,
      })

      if (xpError) {
        console.error("XP update error:", xpError)
      }
    }

    return NextResponse.json({
      verified: passed,
      message: passed
        ? `Quiz completed! Score: ${score}% - You earned ${task.xp_reward} XP`
        : `Quiz failed. Score: ${score}% (Required: ${passingScore}%)`,
      xpEarned: passed ? task.xp_reward : 0,
      score,
      correctAnswers,
      totalQuestions,
    })
  } catch (error) {
    console.error("Learn completion error:", error)
    return NextResponse.json({ error: "Quiz submission failed" }, { status: 500 })
  }
}
