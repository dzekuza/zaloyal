'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function TestDiscordForm() {
  const [socialPlatform, setSocialPlatform] = useState('')
  const [socialAction, setSocialAction] = useState('')
  const [socialUrl, setSocialUrl] = useState('')
  const [socialUsername, setSocialUsername] = useState('')

  const isDiscord = socialPlatform === 'discord'

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Test Discord Form Logic</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Platform</Label>
            <Select value={socialPlatform} onValueChange={setSocialPlatform}>
              <SelectTrigger>
                <SelectValue placeholder="Select platform" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="discord">Discord</SelectItem>
                <SelectItem value="twitter">Twitter</SelectItem>
                <SelectItem value="telegram">Telegram</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Action</Label>
            <Select value={socialAction} onValueChange={setSocialAction}>
              <SelectTrigger>
                <SelectValue placeholder="Select action" />
              </SelectTrigger>
              <SelectContent>
                {isDiscord ? (
                  <SelectItem value="join">Join server</SelectItem>
                ) : (
                  <>
                    <SelectItem value="follow">Follow</SelectItem>
                    <SelectItem value="like">Like</SelectItem>
                    <SelectItem value="share">Share</SelectItem>
                    <SelectItem value="comment">Comment</SelectItem>
                    <SelectItem value="join">Join</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{isDiscord ? 'Discord Invite URL' : 'URL'}</Label>
            <Input
              placeholder={isDiscord ? 'https://discord.gg/...' : 'https://...'}
              value={socialUrl}
              onChange={(e) => setSocialUrl(e.target.value)}
            />
            {isDiscord && (
              <p className="text-xs text-gray-400">
                Enter the Discord server invite URL (e.g., https://discord.gg/abc123)
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>{isDiscord ? 'Server Name' : 'Username'}</Label>
            <Input
              placeholder={isDiscord ? 'My Discord Server' : '@username'}
              value={socialUsername}
              onChange={(e) => setSocialUsername(e.target.value)}
            />
            {isDiscord && (
              <p className="text-xs text-gray-400">
                Enter a name for your Discord server (optional)
              </p>
            )}
          </div>

          <div className="p-4 bg-gray-100 rounded">
            <h3 className="font-semibold mb-2">Debug Info:</h3>
            <p><strong>Platform:</strong> {socialPlatform}</p>
            <p><strong>Is Discord:</strong> {isDiscord ? 'Yes' : 'No'}</p>
            <p><strong>Action:</strong> {socialAction}</p>
            <p><strong>URL Label:</strong> {isDiscord ? 'Discord Invite URL' : 'URL'}</p>
            <p><strong>Username Label:</strong> {isDiscord ? 'Server Name' : 'Username'}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 