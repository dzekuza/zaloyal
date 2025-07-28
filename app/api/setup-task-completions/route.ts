import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseAnonKey)

export async function POST(request: NextRequest) {
  try {
    // Create task_completions table
    const { error: tableError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS public.task_completions (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
          task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
          quest_id UUID REFERENCES public.quests(id) ON DELETE CASCADE,
          action TEXT NOT NULL,
          task_type TEXT,
          social_platform TEXT,
          social_action TEXT,
          visit_url TEXT,
          download_url TEXT,
          quiz_answers JSONB,
          duration_seconds INTEGER,
          metadata JSONB,
          completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          ip_address TEXT,
          user_agent TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    })

    if (tableError) {
      console.error('Error creating table:', tableError)
      return NextResponse.json({ error: "Failed to create table" }, { status: 500 })
    }

    // Create indexes
    const { error: indexError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE INDEX IF NOT EXISTS idx_task_completions_user_id ON public.task_completions(user_id);
        CREATE INDEX IF NOT EXISTS idx_task_completions_task_id ON public.task_completions(task_id);
        CREATE INDEX IF NOT EXISTS idx_task_completions_quest_id ON public.task_completions(quest_id);
        CREATE INDEX IF NOT EXISTS idx_task_completions_action ON public.task_completions(action);
        CREATE INDEX IF NOT EXISTS idx_task_completions_completed_at ON public.task_completions(completed_at);
      `
    })

    if (indexError) {
      console.error('Error creating indexes:', indexError)
    }

    // Enable RLS
    const { error: rlsError } = await supabase.rpc('exec_sql', {
      sql: `ALTER TABLE public.task_completions ENABLE ROW LEVEL SECURITY;`
    })

    if (rlsError) {
      console.error('Error enabling RLS:', rlsError)
    }

    return NextResponse.json({ 
      success: true, 
      message: "Task completions table created successfully" 
    })

  } catch (error) {
    console.error('Error in setup-task-completions:', error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
} 