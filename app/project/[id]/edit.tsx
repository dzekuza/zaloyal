"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import ImageUpload from "@/components/image-upload"
import { ArrowLeft } from "lucide-react"

export default function EditProjectPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string

  const [project, setProject] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  // Editable fields
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState("")
  const [websiteUrl, setWebsiteUrl] = useState("")
  const [logoUrl, setLogoUrl] = useState("")
  const [coverImageUrl, setCoverImageUrl] = useState("")
  const [twitterUrl, setTwitterUrl] = useState("")
  const [discordUrl, setDiscordUrl] = useState("")
  const [telegramUrl, setTelegramUrl] = useState("")
  const [githubUrl, setGithubUrl] = useState("")
  const [mediumUrl, setMediumUrl] = useState("")

  useEffect(() => {
    const fetchProjectAndUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      console.log('Current user:', user)
      setCurrentUserId(user?.id || null)
      const { data, error } = await supabase.from("projects").select("*").eq("id", projectId).single()
      if (error || !data) {
        console.error('Project fetch error:', error)
        setError("Project not found")
        setLoading(false)
        return
      }
      console.log('Fetched project:', data)
      setProject(data)
      setName(data.name || "")
      setDescription(data.description || "")
      setCategory(data.category || "")
      setWebsiteUrl(data.website_url || "")
      setLogoUrl(data.logo_url || "")
      setCoverImageUrl(data.cover_image_url || "")
      setTwitterUrl(data.twitter_url || "")
      setDiscordUrl(data.discord_url || "")
      setTelegramUrl(data.telegram_url || "")
      setGithubUrl(data.github_url || "")
      setMediumUrl(data.medium_url || "")
      setLoading(false)
      // Log isOwner after setting project and user
      setTimeout(() => {
        console.log('isOwner:', user?.id, data.owner_id, user?.id === data.owner_id)
      }, 100)
    }
    fetchProjectAndUser()
  }, [projectId])

  const isOwner = currentUserId && project && project.owner_id === currentUserId

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
      }).eq("id", projectId)
      if (updateError) throw updateError
      setSuccess("Project updated!")
    } catch (e: any) {
      setError(e.message || "Failed to update project")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-white text-xl">Loading...</div>
  }

  if (!project) {
    return <div className="min-h-screen flex items-center justify-center text-white text-xl">{error || "Project not found"}</div>
  }

  if (!isOwner) {
    console.warn('Not owner:', { currentUserId, project })
    return <div className="min-h-screen flex items-center justify-center text-white text-xl">You are not authorized to edit this project.</div>
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center py-12">
      <Card className="bg-gradient-to-br from-white/10 to-white/5 border-white/20 backdrop-blur-sm w-full max-w-2xl">
        <CardHeader>
          <div className="flex items-center gap-4 mb-4">
            <Link href={`/project/${projectId}`} className="text-gray-400 hover:text-white transition-colors">
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <CardTitle className="text-white">Edit Project</CardTitle>
          </div>
          <CardDescription className="text-gray-300">Update your project information below</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-sm">{error}</div>}
          {success && <div className="p-3 bg-green-500/20 border border-green-500/30 rounded-lg text-green-400 text-sm">{success}</div>}
          <div className="space-y-4">
            <label className="text-white block mb-1">Project Name</label>
            <Input value={name} onChange={e => setName(e.target.value)} className="bg-white/10 border-white/20 text-white" />
          </div>
          <div className="space-y-4">
            <label className="text-white block mb-1">Description</label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} className="bg-white/10 border-white/20 text-white" rows={3} />
          </div>
          <div className="space-y-4">
            <label className="text-white block mb-1">Category</label>
            <Input value={category} onChange={e => setCategory(e.target.value)} className="bg-white/10 border-white/20 text-white" />
          </div>
          <div className="space-y-4">
            <label className="text-white block mb-1">Website URL</label>
            <Input value={websiteUrl} onChange={e => setWebsiteUrl(e.target.value)} className="bg-white/10 border-white/20 text-white" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-white block mb-1">Project Logo</label>
              <ImageUpload
                onImageUploaded={setLogoUrl}
                onImageRemoved={() => setLogoUrl("")}
                currentImage={logoUrl}
                maxSizeMB={2}
                label="Upload Logo"
              />
            </div>
            <div className="space-y-2">
              <label className="text-white block mb-1">Cover Image</label>
              <ImageUpload
                onImageUploaded={setCoverImageUrl}
                onImageRemoved={() => setCoverImageUrl("")}
                currentImage={coverImageUrl}
                maxSizeMB={5}
                label="Upload Cover"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input placeholder="Twitter URL" value={twitterUrl} onChange={e => setTwitterUrl(e.target.value)} className="bg-white/10 border-white/20 text-white" />
            <Input placeholder="Discord URL" value={discordUrl} onChange={e => setDiscordUrl(e.target.value)} className="bg-white/10 border-white/20 text-white" />
            <Input placeholder="Telegram URL" value={telegramUrl} onChange={e => setTelegramUrl(e.target.value)} className="bg-white/10 border-white/20 text-white" />
            <Input placeholder="GitHub URL" value={githubUrl} onChange={e => setGithubUrl(e.target.value)} className="bg-white/10 border-white/20 text-white" />
            <Input placeholder="Medium URL" value={mediumUrl} onChange={e => setMediumUrl(e.target.value)} className="bg-white/10 border-white/20 text-white" />
          </div>
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving} className="bg-gradient-to-r from-blue-500 to-purple-500 text-white border-0">
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 