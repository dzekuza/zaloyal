"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import AvatarUpload from "@/components/avatar-upload"
import { walletAuth, type WalletUser } from "@/lib/wallet-auth"

interface EditQuestFormProps {
  quest: any;
  onSave?: () => void;
}

export default function EditQuestForm({ quest, onSave }: EditQuestFormProps) {
  const [title, setTitle] = useState(quest.title || "")
  const [description, setDescription] = useState(quest.description || "")
  const [imageUrl, setImageUrl] = useState(quest.image_url || "")
  const [totalXp, setTotalXp] = useState(quest.total_xp || 0)
  const [status, setStatus] = useState(quest.status || "active")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [walletUser, setWalletUser] = useState<WalletUser | null>(null)
  const [emailUser, setEmailUser] = useState<any>(null)

  useEffect(() => {
    // Check for wallet user
    const unsubscribeWallet = walletAuth.onAuthStateChange((user) => {
      setWalletUser(user)
    })

    // Check for email user
    const checkEmailAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase.from("users").select("*").eq("email", user.email).single()
        setEmailUser({ ...user, profile })
      }
    }
    checkEmailAuth()

    return () => unsubscribeWallet()
  }, [])

  const handleSave = async () => {
    if (!title.trim()) {
      setError("Quest title is required")
      return
    }

    setSaving(true)
    setError("")
    setSuccess("")
    
    try {
      // Get current user ID with better error handling
      let userId = null
      let userError = null
      
      if (walletUser) {
        // Try wallet lookup first
        const { data: userData, error: walletError } = await supabase
          .from("users")
          .select("id")
          .eq("wallet_address", walletUser.walletAddress.toLowerCase())
          .single()
        
        if (userData && !walletError) {
          userId = userData.id
        } else {
          // If wallet user not found, try to create them
          try {
            const response = await fetch("/api/users/upsert", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ 
                walletAddress: walletUser.walletAddress,
                username: walletUser.username || `User${walletUser.walletAddress.slice(-6)}`
              }),
            })
            
            if (response.ok) {
              const { user } = await response.json()
              userId = user.id
            } else {
              const errorData = await response.json()
              // If creation fails, try email lookup as fallback
              if (emailUser?.email) {
                const { data: emailUserData, error: emailError } = await supabase
                  .from("users")
                  .select("id")
                  .eq("email", emailUser.email.toLowerCase())
                  .single()
                
                if (emailUserData && !emailError) {
                  userId = emailUserData.id
                } else {
                  userError = `User not found and could not be created. Wallet: ${walletError?.message}, Create: ${errorData.error}, Email: ${emailError?.message}`
                }
              } else {
                userError = `User not found and could not be created. Wallet: ${walletError?.message}, Create: ${errorData.error}`
              }
            }
          } catch (createErr: any) {
            userError = `Failed to create user: ${createErr.message}`
          }
        }
      } else if (emailUser?.profile) {
        // Email user - use profile ID directly
        userId = emailUser.profile.id
      } else {
        userError = "No authenticated user found"
      }

      if (!userId) {
        console.error("User lookup failed:", {
          walletUser,
          emailUser,
          userError
        })
        throw new Error(userError || "User not found. Please sign in again.")
      }

      if (quest.id === 'new') {
        // Create new quest
        const { data: newQuest, error: insertError } = await supabase
          .from("quests")
          .insert({
            title: title.trim(),
            description: description.trim(),
            image_url: imageUrl,
            total_xp: totalXp,
            status,
            creator_id: userId,
            project_id: quest.project_id,
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
            image_url: imageUrl,
            total_xp: totalXp,
            status,
          })
          .eq("id", quest.id)
        
        if (updateError) throw updateError
        
        setSuccess("Quest updated successfully!")
      }
      
      if (onSave) onSave()
    } catch (e: any) {
      console.error("Quest save error:", e)
      setError(e.message || "Failed to save quest")
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
      className="space-y-6 w-full max-w-2xl pr-2"
      style={{ scrollbarGutter: 'stable' }}
      onSubmit={e => { e.preventDefault(); handleSave(); }}
    >
      {error && (
        <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="p-3 bg-green-500/20 border border-green-500/30 rounded-lg text-green-400 text-sm">
          {success}
        </div>
      )}
      
      <div className="space-y-2">
        <label className="text-white block mb-1 font-medium">Quest Title</label>
        <Input 
          value={title} 
          onChange={e => setTitle(e.target.value)} 
          className="bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:ring-2 focus:ring-green-500" 
          placeholder="Enter quest title"
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
          placeholder="Describe the quest"
        />
      </div>
      
      <div className="space-y-2 flex flex-col items-start">
        <label className="text-white block mb-1 font-medium">Quest Image</label>
        <AvatarUpload
          onAvatarUploaded={setImageUrl}
          currentAvatar={imageUrl}
          userId={quest.id === 'new' ? 'temp' : quest.id}
          size="lg"
          className="mx-auto"
          uploadType="quest-image"
        />
      </div>
      
      <div className="space-y-2">
        <label className="text-white block mb-1 font-medium">Total XP</label>
        <Input 
          type="number" 
          value={totalXp} 
          onChange={e => setTotalXp(Number(e.target.value))} 
          className="bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:ring-2 focus:ring-green-500" 
          min={0} 
          required 
        />
      </div>
      
      <div className="space-y-2">
        <label className="text-white block mb-1 font-medium">Status</label>
        <Select value={status} onValueChange={setStatus}>
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
            disabled={saving}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {saving ? "Deleting..." : "Delete Quest"}
          </Button>
        )}
        <Button 
          type="submit" 
          disabled={saving} 
          className="bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0 hover:from-green-600 hover:to-emerald-600"
        >
          {saving ? "Saving..." : quest.id === 'new' ? "Create Quest" : "Save Changes"}
        </Button>
      </div>
    </form>
  )
} 