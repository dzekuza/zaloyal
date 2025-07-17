"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import ImageUpload from "@/components/image-upload"
import AvatarUpload from "@/components/avatar-upload"

export default function EditProjectForm({ project, onSave }: { project: any, onSave?: () => void }) {
  const [name, setName] = useState(project.name || "")
  const [description, setDescription] = useState(project.description || "")
  const [category, setCategory] = useState(project.category || "")
  const [websiteUrl, setWebsiteUrl] = useState(project.website_url || "")
  const [logoUrl, setLogoUrl] = useState(project.logo_url || "")
  const [coverImageUrl, setCoverImageUrl] = useState(project.cover_image_url || "")
  const [twitterUrl, setTwitterUrl] = useState(project.twitter_url || "")
  const [discordUrl, setDiscordUrl] = useState(project.discord_url || "")
  const [telegramUrl, setTelegramUrl] = useState(project.telegram_url || "")
  const [githubUrl, setGithubUrl] = useState(project.github_url || "")
  const [mediumUrl, setMediumUrl] = useState(project.medium_url || "")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const handleSave = async () => {
    setSaving(true)
    setError("")
    setSuccess("")
    try {
      const { error: updateError } = await supabase.from("projects").update({
        name,
        description,
        category,
        website_url: websiteUrl,
        logo_url: logoUrl,
        cover_image_url: coverImageUrl,
        twitter_url: twitterUrl,
        discord_url: discordUrl,
        telegram_url: telegramUrl,
        github_url: githubUrl,
        medium_url: mediumUrl,
      }).eq("id", project.id)
      if (updateError) throw updateError
      setSuccess("Project updated!")
      if (onSave) onSave()
    } catch (e: any) {
      setError(e.message || "Failed to update project")
    } finally {
      setSaving(false)
    }
  }

  return (
    <form
      className="space-y-6 w-full max-w-2xl pr-2"
      style={{ scrollbarGutter: 'stable' }}
      onSubmit={e => { e.preventDefault(); handleSave(); }}
    >
      {error && <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-sm">{error}</div>}
      {success && <div className="p-3 bg-green-500/20 border border-green-500/30 rounded-lg text-green-400 text-sm">{success}</div>}
      <div className="space-y-2">
        <label className="text-white block mb-1">Project Name</label>
        <Input value={name} onChange={e => setName(e.target.value)} className="bg-white/10 border-white/20 text-white" required />
      </div>
      <div className="space-y-2">
        <label className="text-white block mb-1">Description</label>
        <Textarea value={description} onChange={e => setDescription(e.target.value)} className="bg-white/10 border-white/20 text-white" rows={3} required />
      </div>
      <div className="space-y-2">
        <label className="text-white block mb-1">Category</label>
        <Input value={category} onChange={e => setCategory(e.target.value)} className="bg-white/10 border-white/20 text-white" required />
      </div>
      <div className="space-y-2">
        <label className="text-white block mb-1">Website URL</label>
        <Input value={websiteUrl} onChange={e => setWebsiteUrl(e.target.value)} className="bg-white/10 border-white/20 text-white" />
      </div>
      <div className="space-y-6">
        <div className="space-y-2 flex flex-col items-start">
          <label className="text-white block mb-1">Project Logo</label>
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
          <label className="text-white block mb-1">Cover Image</label>
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
      <div className="flex justify-end">
        <Button type="submit" disabled={saving} className="bg-green-600 hover:bg-green-700 text-white">
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </form>
  )
} 