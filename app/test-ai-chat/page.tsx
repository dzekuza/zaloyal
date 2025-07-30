"use client"

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import AIQuestChat from '@/components/ai-quest-chat'
import { useAuth } from '@/components/auth-provider-wrapper'

export default function TestAIChatPage() {
  const { user } = useAuth()

  return (
    <div className="min-h-screen bg-[#111111] p-6">
      <div className="max-w-4xl mx-auto">
        <Card className="bg-[#1a1a1a] border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">AI Quest Chat Test</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 text-gray-300">
              <p>
                This page tests the AI Quest Chat component. You should see a chat icon in the bottom-right corner.
              </p>
              
              <div className="bg-gray-800 p-4 rounded-lg">
                <h3 className="font-semibold mb-2">Current User Status:</h3>
                {user ? (
                  <div className="space-y-2">
                    <p><strong>Authenticated:</strong> Yes</p>
                    <p><strong>User ID:</strong> {user.id}</p>
                    <p><strong>Email:</strong> {user.email}</p>
                    <p><strong>Username:</strong> {user.username || 'Not set'}</p>
                  </div>
                ) : (
                  <p><strong>Authenticated:</strong> No - Please log in to test the AI chat</p>
                )}
              </div>

              <div className="bg-gray-800 p-4 rounded-lg">
                <h3 className="font-semibold mb-2">Instructions:</h3>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Look for the chat icon in the bottom-right corner</li>
                  <li>Click the icon to open the AI chat</li>
                  <li>Select a project from your owned projects</li>
                  <li>Describe the quest you want to create</li>
                  <li>Follow the AI's guidance to create your quest</li>
                </ol>
              </div>

              <div className="bg-gray-800 p-4 rounded-lg">
                <h3 className="font-semibold mb-2">Features to Test:</h3>
                <ul className="list-disc list-inside space-y-1">
                  <li>Chat interface opens and closes correctly</li>
                  <li>Project selection works</li>
                  <li>AI responds to messages</li>
                  <li>Quest plan generation</li>
                  <li>Quest and task creation in database</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}