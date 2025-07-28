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
import { Trophy } from 'lucide-react'

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
        <div className="space-y-4 sm:space-y-6">
          <div className="animate-pulse">
            <div className="h-6 sm:h-8 bg-gray-700 rounded w-1/2 sm:w-1/3 mb-4"></div>
            <div className="space-y-3 sm:space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-24 sm:h-32 bg-gray-700 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      <div className="space-y-4 sm:space-y-6">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Quests</h1>
          <Link href="/create">
            <Button className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white">
              <Plus className="w-4 h-4 mr-2" />
              Create Quest
            </Button>
          </Link>
        </div>

        {/* Quests Grid */}
        {quests.length === 0 ? (
          <div className="text-center py-8 sm:py-12">
            <div className="max-w-md mx-auto">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-700 rounded-full flex items-center justify-center">
                <Trophy className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-white mb-2">No Quests Available</h3>
              <p className="text-gray-400 text-sm sm:text-base">Check back later for new quests or create your own using the button above</p>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 sm:gap-6">
            {quests.map((quest) => (
              <QuestCard key={quest.id} quest={quest}>
                <Link href={`/quest/${quest.id}`}>
                  <Button className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white">
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