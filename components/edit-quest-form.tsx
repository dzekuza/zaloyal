"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import AvatarUpload from "@/components/avatar-upload"

export default function EditQuestForm({ quest, onSave }: { quest: any, onSave?: () => void }) {
  const [title, setTitle] = useState(quest.title || "")
  const [description, setDescription] = useState(quest.description || "")
  const [imageUrl, setImageUrl] = useState(quest.image_url || "")
  const [totalXp, setTotalXp] = useState(quest.total_xp || 0)
  const [status, setStatus] = useState(quest.status || "active")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const handleSave = async () => {
    setSaving(true)
    setError("")
    setSuccess("")
    try {
      const { error: updateError } = await supabase.from("quests").update({
        title,
        description,
        image_url: imageUrl,
        total_xp: totalXp,
        status,
      }).eq("id", quest.id)
      if (updateError) throw updateError
      setSuccess("Quest updated!")
      if (onSave) onSave()
    } catch (e: any) {
      setError(e.message || "Failed to update quest")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this quest? This action cannot be undone.")) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const { error: deleteError } = await supabase.from("quests").delete().eq("id", quest.id);
      if (deleteError) throw deleteError;
      setSuccess("Quest deleted!");
      if (onSave) onSave();
    } catch (e: any) {
      setError(e.message || "Failed to delete quest");
    } finally {
      setSaving(false);
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
        <label className="text-white block mb-1">Quest Title</label>
        <Input value={title} onChange={e => setTitle(e.target.value)} className="bg-white/10 border-white/20 text-white" required />
      </div>
      <div className="space-y-2">
        <label className="text-white block mb-1">Description</label>
        <Textarea value={description} onChange={e => setDescription(e.target.value)} className="bg-white/10 border-white/20 text-white" rows={3} />
      </div>
      <div className="space-y-2 flex flex-col items-start">
        <label className="text-white block mb-1">Quest Image</label>
        <AvatarUpload
          onAvatarUploaded={setImageUrl}
          currentAvatar={imageUrl}
          userId={quest.id}
          size="lg"
          className="mx-auto"
          uploadType="quest-image"
        />
      </div>
      <div className="space-y-2">
        <label className="text-white block mb-1">Total XP</label>
        <Input type="number" value={totalXp} onChange={e => setTotalXp(Number(e.target.value))} className="bg-white/10 border-white/20 text-white" min={0} required />
      </div>
      <div className="space-y-2">
        <label className="text-white block mb-1">Status</label>
        <select value={status} onChange={e => setStatus(e.target.value)} className="bg-white/10 border-white/20 text-white rounded px-3 py-2">
          <option value="active">Active</option>
          <option value="draft">Draft</option>
        </select>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="destructive" onClick={handleDelete} disabled={saving}>
          Delete Quest
        </Button>
        <Button type="submit" disabled={saving} className="bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0">
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </form>
  )
} 