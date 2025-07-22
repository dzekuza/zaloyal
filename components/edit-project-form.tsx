"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import ImageUpload from "@/components/image-upload"
import AvatarUpload from "@/components/avatar-upload"
import { Card, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface EditProjectFormProps {
  project: any;
  onSave?: () => void;
}

export default function EditProjectForm({ project, onSave }: EditProjectFormProps) {
  const [name, setName] = useState(project.name || "")
  const [description, setDescription] = useState(project.description || "")
  const [category, setCategory] = useState(project.category || "")
  const [websiteUrl, setWebsiteUrl] = useState(project.website_url || "")
  const [logoUrl, setLogoUrl] = useState(project.logo_url || "")
  const [coverImageUrl, setCoverImageUrl] = useState(project.cover_image_url || "")
  const [twitterUrl, setTwitterUrl] = useState(project.twitter_url || "")
  const [twitterUsername, setTwitterUsername] = useState(project.twitter_username || "")
  const [discordUrl, setDiscordUrl] = useState(project.discord_url || "")
  const [telegramUrl, setTelegramUrl] = useState(project.telegram_url || "")
  const [githubUrl, setGithubUrl] = useState(project.github_url || "")
  const [mediumUrl, setMediumUrl] = useState(project.medium_url || "")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const handleSave = async () => {
    if (!name.trim()) {
      setError("Project name is required")
      return
    }

    if (!description.trim()) {
      setError("Project description is required")
      return
    }

    setSaving(true)
    setError("")
    setSuccess("")
    
    try {
      const { error: updateError } = await supabase.from("projects").update({
        name: name.trim(),
        description: description.trim(),
        category: category.trim(),
        website_url: websiteUrl.trim() || null,
        logo_url: logoUrl,
        cover_image_url: coverImageUrl,
        twitter_url: twitterUrl.trim() || null,
        twitter_username: twitterUsername.trim() || null,
        discord_url: discordUrl.trim() || null,
        telegram_url: telegramUrl.trim() || null,
        github_url: githubUrl.trim() || null,
        medium_url: mediumUrl.trim() || null,
      }).eq("id", project.id)
      
      if (updateError) throw updateError
      
      setSuccess("Project updated successfully!")
      if (onSave) onSave()
    } catch (e: any) {
      setError(e.message || "Failed to update project")
    } finally {
      setSaving(false)
    }
  }

  return (
    <form
      className="space-y-6 w-full px-6 pb-6"
      style={{ scrollbarGutter: 'stable' }}
      onSubmit={e => { e.preventDefault(); handleSave(); }}
    >
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {success && (
        <Alert variant="default">
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}
      
      <div className="space-y-6">
        <div className="space-y-2">
          <label className="text-white block mb-1 font-medium">Project Name</label>
          <Input 
            value={name} 
            onChange={e => setName(e.target.value)} 
            className="bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:ring-2 focus:ring-green-500" 
            placeholder="Enter project name"
            required 
          />
        </div>
        
        <div className="space-y-2">
          <label className="text-white block mb-1 font-medium">Description</label>
          <Textarea 
            value={description} 
            onChange={e => setDescription(e.target.value)} 
            className="bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:ring-2 focus:ring-green-500" 
            rows={3}
            placeholder="Describe your project"
            required 
          />
        </div>
        
        <div className="space-y-2">
          <label className="text-white block mb-1 font-medium">Category</label>
          <Input 
            value={category} 
            onChange={e => setCategory(e.target.value)} 
            className="bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:ring-2 focus:ring-green-500" 
            placeholder="e.g., DeFi, NFT, Gaming"
            required 
          />
        </div>
        
        <div className="space-y-2">
          <label className="text-white block mb-1 font-medium">Website URL</label>
          <Input 
            value={websiteUrl} 
            onChange={e => setWebsiteUrl(e.target.value)} 
            className="bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:ring-2 focus:ring-green-500" 
            placeholder="https://yourproject.com"
            type="url"
          />
        </div>
        
        <div className="space-y-6">
          <div className="space-y-2 flex flex-col items-start">
            <label className="text-white block mb-1 font-medium">Project Logo</label>
            <div className="mb-2">
              <AvatarUpload
                onAvatarUploaded={setLogoUrl}
                currentAvatar={logoUrl}
                userId={project.id}
                size="md"
                className="mx-auto"
              />
            </div>
          </div>
          
          <div className="space-y-2 flex flex-col items-start">
            <label className="text-white block mb-1 font-medium">Cover Image</label>
            <div className="w-full">
              <ImageUpload
                onImageUploaded={setCoverImageUrl}
                onImageRemoved={() => setCoverImageUrl("")}
                currentImage={coverImageUrl}
                maxSizeMB={5}
                label="Upload Cover"
              />
            </div>
          </div>
        </div>

        {/* Social Links */}
        <div className="space-y-4">
          <h3 className="text-white font-medium">Social Links</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-white block mb-1 text-sm">Twitter</label>
              <Input 
                value={twitterUrl} 
                onChange={e => setTwitterUrl(e.target.value)} 
                className="bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:ring-2 focus:ring-green-500" 
                placeholder="https://twitter.com/yourproject"
                type="url"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-white block mb-1 text-sm">Twitter Username</label>
              <Input 
                value={twitterUsername} 
                onChange={e => setTwitterUsername(e.target.value)} 
                className="bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:ring-2 focus:ring-green-500" 
                placeholder="e.g. belinkxyz"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-white block mb-1 text-sm">Discord</label>
              <Input 
                value={discordUrl} 
                onChange={e => setDiscordUrl(e.target.value)} 
                className="bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:ring-2 focus:ring-green-500" 
                placeholder="https://discord.gg/yourproject"
                type="url"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-white block mb-1 text-sm">Telegram</label>
              <Input 
                value={telegramUrl} 
                onChange={e => setTelegramUrl(e.target.value)} 
                className="bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:ring-2 focus:ring-green-500" 
                placeholder="https://t.me/yourproject"
                type="url"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-white block mb-1 text-sm">GitHub</label>
              <Input 
                value={githubUrl} 
                onChange={e => setGithubUrl(e.target.value)} 
                className="bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:ring-2 focus:ring-green-500" 
                placeholder="https://github.com/yourproject"
                type="url"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-white block mb-1 text-sm">Medium</label>
              <Input 
                value={mediumUrl} 
                onChange={e => setMediumUrl(e.target.value)} 
                className="bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:ring-2 focus:ring-green-500" 
                placeholder="https://medium.com/@yourproject"
                type="url"
              />
            </div>
          </div>
        </div>
        
        <div className="flex justify-end pt-4">
          <Button 
            type="submit" 
            disabled={saving} 
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>
    </form>
  )
} 