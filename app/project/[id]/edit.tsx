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
import PageContainer from "@/components/PageContainer"

export default function EditProjectPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [project, setProject] = useState<any>(null)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [imageUrl, setImageUrl] = useState("")
  const [quests, setQuests] = useState<any[]>([])

  useEffect(() => {
    async function fetchProject() {
      setLoading(true)
      setError(null)
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("id", id)
        .single()
      if (error) {
        setError("Failed to load project.")
      } else {
        setProject(data)
        setName(data.name || "")
        setDescription(data.description || "")
        setImageUrl(data.image_url || "")
      }
      setLoading(false)
    }
    if (id) fetchProject()
  }, [id])

  useEffect(() => {
    async function fetchQuests() {
      if (!id) return;
      const { data, error } = await supabase
        .from("quests")
        .select("*")
        .eq("project_id", id);
      if (!error) setQuests(data || []);
    }
    fetchQuests();
  }, [id]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const { error } = await supabase
      .from("projects")
      .update({ name, description, image_url: imageUrl })
      .eq("id", id)
    setSaving(false)
    if (error) {
      setError("Failed to update project.")
    } else {
      router.push(`/project/${id}`)
    }
  }

  if (loading) return <div className="p-8 text-center">Loading...</div>
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>
  if (!project) return <div className="p-8 text-center">Project not found.</div>

  return (
    <PageContainer>
      <Button asChild variant="ghost" className="mb-4">
        <Link href={`/project/${id}`}> <ArrowLeft className="mr-2 h-4 w-4" /> Back to Project </Link>
      </Button>
      <Card>
        <CardHeader>
          <CardTitle>Edit Project</CardTitle>
          <CardDescription>Update your project details below.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block mb-1 font-medium">Project Name</label>
              <Input value={name} onChange={e => setName(e.target.value)} required maxLength={100} />
            </div>
            <div>
              <label className="block mb-1 font-medium">Description</label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={4} maxLength={500} />
            </div>
            <div>
              <label className="block mb-1 font-medium">Project Image</label>
              <ImageUpload
                currentImage={imageUrl}
                onImageUploaded={setImageUrl}
                onImageRemoved={() => setImageUrl("")}
                label="Upload Project Image"
              />
              {imageUrl && (
                <div className="flex justify-center mt-4">
                  <img src={imageUrl} alt="Project" className="rounded w-32 h-32 object-cover border" />
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save Changes"}</Button>
              <Button type="button" variant="outline" onClick={() => router.push(`/project/${id}`)}>Cancel</Button>
            </div>
            {error && <div className="text-red-500 text-sm mt-2">{error}</div>}
          </form>
        </CardContent>
      </Card>
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Edit Quests</CardTitle>
          <CardDescription>Manage quests for this project.</CardDescription>
        </CardHeader>
        <CardContent>
          {quests.length === 0 ? (
            <div className="text-gray-400">No quests found for this project.</div>
          ) : (
            <ul className="space-y-4">
              {quests.map((quest) => (
                <li key={quest.id} className="flex items-center justify-between">
                  <span className="font-medium">{quest.title}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => router.push(`/quest/${quest.id}/edit`)}
                  >
                    Edit
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </PageContainer>
  )
} 