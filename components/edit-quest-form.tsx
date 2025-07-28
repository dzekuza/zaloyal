"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import ImageUpload from "@/components/image-upload"
import { Card, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useAuth } from "@/components/auth-provider-wrapper"

interface EditQuestFormProps {
  quest: any;
  onSave?: () => void;
}

export default function EditQuestForm({ quest, onSave }: EditQuestFormProps) {
  const { user, loading: authLoading } = useAuth()
  const [title, setTitle] = useState(quest.title || "")
  const [description, setDescription] = useState(quest.description || "")
  // Removed imageUrl state as it's not supported in the database
  // Removed totalXp state as total_xp is now calculated automatically from tasks
  const [status, setStatus] = useState(quest.status || "active")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const handleSave = async () => {
    if (!title.trim()) {
      setError("Quest title is required")
      return
    }

    if (!user) {
      setError("You must be signed in to create or edit quests")
      return
    }

    setSaving(true)
    setError("")
    setSuccess("")
    
    try {
      // Debug: Log the quest object and user
      console.log("Debug: Quest object:", quest)
      console.log("Debug: Quest project_id:", quest.project_id)
      console.log("Debug: Current user:", user)
      
      // Use the authenticated user ID directly
      const userId = user.id
      console.log("Debug: Using user ID:", userId)

      // Check if user owns the project for this quest
      if (quest.id !== 'new') {
        console.log("Debug: Checking project ownership for existing quest")
        const { data: projectData, error: projectError } = await supabase
          .from("projects")
          .select("owner_id")
          .eq("id", quest.project_id)
          .single()
        
        console.log("Debug: Project data:", projectData)
        console.log("Debug: Project error:", projectError)
        
        if (projectError || !projectData) {
          throw new Error("Project not found or access denied")
        }
        
        if (projectData.owner_id !== userId) {
          throw new Error("You don't have permission to edit this quest")
        }
      } else {
        // For new quests, check if user owns the project
        console.log("Debug: Checking project ownership for new quest")
        const { data: projectData, error: projectError } = await supabase
          .from("projects")
          .select("owner_id")
          .eq("id", quest.project_id)
          .single()
        
        if (projectError || !projectData) {
          throw new Error("Project not found or access denied")
        }
        
        if (projectData.owner_id !== userId) {
          throw new Error("You don't have permission to create quests for this project")
        }
      }

      if (quest.id === 'new') {
        // Create new quest
        const { data: newQuest, error: insertError } = await supabase
          .from("quests")
          .insert({
            title: title.trim(),
            description: description.trim(),
            project_id: quest.project_id,
            // total_xp is now calculated automatically from tasks
            status,
          })
          .select()
          .single()
        
        if (insertError) throw insertError
        
        setSuccess("Quest created successfully!")
      } else {
        // Update existing quest
        const { error: updateError } = await supabase
          .from("quests")
          .update({
            title: title.trim(),
            description: description.trim(),
            // total_xp is now calculated automatically from tasks
            status,
          })
          .eq("id", quest.id)
        
        if (updateError) throw updateError
        
        setSuccess("Quest updated successfully!")
      }
      
      if (onSave) onSave()
    } catch (e: any) {
      console.error("Quest save error:", e)
      console.error("Quest save error details:", {
        message: e.message,
        code: e.code,
        details: e.details,
        hint: e.hint,
        status: e.status,
        statusText: e.statusText
      })
      
      // Better error message handling
      let errorMessage = "Failed to save quest"
      
      if (e.message) {
        errorMessage = e.message
      } else if (e.details) {
        errorMessage = e.details
      } else if (e.hint) {
        errorMessage = e.hint
      } else if (e.statusText) {
        errorMessage = e.statusText
      }
      
      // Handle specific RLS errors
      if (errorMessage.includes("row-level security policy")) {
        errorMessage = "You don't have permission to perform this action. Please make sure you're logged in and own this project."
      } else if (errorMessage.includes("not found")) {
        errorMessage = "Project or quest not found. Please refresh the page and try again."
      } else if (errorMessage.includes("authentication")) {
        errorMessage = "Authentication required. Please log in and try again."
      }
      
      setError(errorMessage)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (quest.id === 'new') {
      setError("Cannot delete a quest that hasn't been created yet")
      return
    }

    if (!window.confirm("Are you sure you want to delete this quest? This action cannot be undone.")) return;
    
    setSaving(true);
    setError("");
    setSuccess("");
    
    try {
      const { error: deleteError } = await supabase.from("quests").delete().eq("id", quest.id);
      if (deleteError) throw deleteError;
      
      setSuccess("Quest deleted successfully!");
      if (onSave) onSave();
    } catch (e: any) {
      setError(e.message || "Failed to delete quest");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      className="space-y-6 w-full px-6 pb-6"
      style={{ scrollbarGutter: 'stable' }}
      onSubmit={e => { e.preventDefault(); handleSave(); }}
    >
      {authLoading && (
        <Alert variant="default">
          <AlertDescription>Loading authentication...</AlertDescription>
        </Alert>
      )}
      
      {!user && !authLoading && (
        <Alert variant="destructive">
          <AlertDescription>You must be signed in to create or edit quests</AlertDescription>
        </Alert>
      )}
      
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
          <label className="text-white block mb-1 font-medium">Quest Title</label>
          <Input 
            value={title} 
            onChange={e => setTitle(e.target.value)} 
            className="bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:ring-2 focus:ring-green-500" 
            placeholder="Enter quest title"
            required 
            disabled={authLoading || !user}
          />
        </div>
        <div className="space-y-2">
          <label className="text-white block mb-1 font-medium">Description</label>
          <Textarea 
            value={description} 
            onChange={e => setDescription(e.target.value)} 
            className="bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:ring-2 focus:ring-green-500" 
            rows={3}
            placeholder="Describe the quest"
            disabled={authLoading || !user}
          />
        </div>
        {/* Removed quest image upload section as it's not supported in the database */}
        {/* Removed Total XP input as total_xp is now calculated automatically from tasks */}
        <div className="space-y-2">
          <label className="text-white block mb-1 font-medium">Status</label>
          <Select value={status} onValueChange={setStatus} disabled={authLoading || !user}>
            <SelectTrigger className="bg-white/10 border-white/20 text-white focus:ring-2 focus:ring-green-500">
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent className="bg-[#111111] border-[#282828]">
              <SelectItem value="active" className="text-white hover:bg-[#161616]">
                Active
              </SelectItem>
              <SelectItem value="draft" className="text-white hover:bg-[#161616]">
                Draft
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex justify-end gap-2 pt-4">
          {quest.id !== 'new' && (
            <Button 
              type="button" 
              variant="destructive" 
              onClick={handleDelete}
              disabled={authLoading || !user || saving}
            >
              Delete Quest
            </Button>
          )}
          <Button 
            type="submit" 
            className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white border-0"
            disabled={authLoading || !user || saving}
          >
            {saving ? "Saving..." : quest.id === 'new' ? "Create Quest" : "Update Quest"}
          </Button>
        </div>
      </div>
    </form>
  )
} 