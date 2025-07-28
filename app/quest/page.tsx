"use client"

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import PageContainer from '@/components/PageContainer'
import QuestCard from '@/components/QuestCard'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '@/components/auth-provider-wrapper'
import AuthWrapper from '@/components/auth-wrapper'

function QuestContent() {
  const { user } = useAuth()
  const [quests, setQuests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchQuests = async () => {
      if (!user) {
        setQuests([])
        setLoading(false)
        return
      }

      try {
        const { data, error } = await supabase
          .from('quests')
          .select(`
            *,
            projects (
              name,
              logo_url
            )
          `)
          .eq('status', 'active')
          .order('created_at', { ascending: false })

        if (error) {
          console.error('Error fetching quests:', error)
        } else {
          setQuests(data || [])
        }
      } catch (error) {
        console.error('Error fetching quests:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchQuests()
  }, [user])

  if (loading) {
    return (
      <PageContainer>
        <div className="space-y-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-700 rounded w-1/3 mb-4"></div>
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-700 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-white">Quests</h1>
          <Link href="/create">
            <Button className="bg-green-600 hover:bg-green-700 text-white">
              <Plus className="w-4 h-4 mr-2" />
              Create Quest
            </Button>
          </Link>
        </div>

        {quests.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400 text-lg">No quests available</p>
            <p className="text-gray-500 text-sm mt-2">Check back later for new quests</p>
          </div>
        ) : (
          <div className="grid gap-6">
            {quests.map((quest) => (
              <QuestCard key={quest.id} quest={quest}>
                <Link href={`/quest/${quest.id}`}>
                  <Button className="bg-green-600 hover:bg-green-700 text-white">
                    View Quest
                  </Button>
                </Link>
              </QuestCard>
            ))}
          </div>
        )}
      </div>
    </PageContainer>
  )
}

export default function QuestPage() {
  return (
    <AuthWrapper
      requireAuth={true}
      title="Sign In Required"
      message="Please sign in with your email or wallet to view quests."
      onAuthClick={() => window.dispatchEvent(new CustomEvent('open-auth-dialog'))}
    >
      <QuestContent />
    </AuthWrapper>
  )
} 