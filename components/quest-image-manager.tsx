"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import ImageUpload from "@/components/image-upload"
import { walletAuth } from "@/lib/wallet-auth"

interface QuestImageManagerProps {
  questId: string
  currentImageUrl?: string
  onImageUpdated: (newUrl: string) => void
}

export default function QuestImageManager({ questId, currentImageUrl, onImageUpdated }: QuestImageManagerProps) {
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleImageUpload = async (imageUrl: string) => {
    const user = await walletAuth.getCurrentUser()
    if (!user) {
      setError("Please connect your wallet")
      return
    }

    setUpdating(true)
    setError(null)

    try {
      const response = await fetch(`/api/quests/${questId}/image`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          imageUrl,
          userWallet: user.walletAddress,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to update image")
      }

      onImageUpdated(imageUrl)
    } catch (error: unknown) {
      console.error("Image update error:", error)
      const message = error instanceof Error ? error.message : "Failed to update quest image"
      setError(message)
    } finally {
      setUpdating(false)
    }
  }

  const handleImageRemove = async () => {
    await handleImageUpload("")
  }

  return (
    <Card className="bg-[#111111] rounded-lg">
      <CardHeader>
        <CardTitle className="text-white">Quest Image</CardTitle>
        <CardDescription className="text-gray-300">Upload or update your quest image</CardDescription>
      </CardHeader>
      <CardContent>
        <ImageUpload
          onImageUploaded={handleImageUpload}
          onImageRemoved={handleImageRemove}
          currentImage={currentImageUrl}
          questId={questId}
        />

        {updating && (
          <div className="mt-3 p-3 bg-green-500/20 border border-green-500/30 rounded-lg text-green-400 text-sm">
            Updating quest image...
          </div>
        )}

        {error && (
          <div className="mt-3 p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-sm">{error}</div>
        )}
      </CardContent>
    </Card>
  )
}
