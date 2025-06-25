"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Upload, User, Loader2 } from "lucide-react"
import { storageService } from "@/lib/storage"

interface AvatarUploadProps {
  onAvatarUploaded: (url: string) => void
  currentAvatar?: string
  userId: string
  size?: "sm" | "md" | "lg"
  className?: string
}

export default function AvatarUpload({
  onAvatarUploaded,
  currentAvatar,
  userId,
  size = "md",
  className = "",
}: AvatarUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const sizeClasses = {
    sm: "w-12 h-12",
    md: "w-20 h-20",
    lg: "w-32 h-32",
  }

  const validateFile = (file: File): string | null => {
    const acceptedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"]

    if (!acceptedTypes.includes(file.type)) {
      return "Please upload a valid image file (JPEG, PNG, GIF, WebP)"
    }

    const maxSizeBytes = 2 * 1024 * 1024 // 2MB
    if (file.size > maxSizeBytes) {
      return "File size too large. Maximum size is 2MB"
    }

    return null
  }

  const handleFileUpload = async (file: File) => {
    const validationError = validateFile(file)
    if (validationError) {
      setError(validationError)
      return
    }

    setError(null)
    setUploading(true)
    setUploadProgress(0)

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + 15
        })
      }, 150)

      const avatarUrl = await storageService.uploadUserAvatar(file, userId)

      clearInterval(progressInterval)
      setUploadProgress(100)

      if (avatarUrl) {
        onAvatarUploaded(avatarUrl)
        setTimeout(() => {
          setUploadProgress(0)
        }, 1000)
      } else {
        setError("Upload failed. Please try again.")
      }
    } catch (error) {
      console.error("Avatar upload error:", error)
      setError("Upload failed. Please try again.")
    } finally {
      setUploading(false)
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      handleFileUpload(file)
    }
  }

  const openFileDialog = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className={className}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        onChange={handleFileSelect}
        className="hidden"
      />

      <div className="relative group">
        <div
          className={`${sizeClasses[size]} rounded-full overflow-hidden bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center relative`}
        >
          {currentAvatar ? (
            <img src={currentAvatar || "/placeholder.svg"} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <User className="w-1/2 h-1/2 text-white" />
          )}

          {uploading && (
            <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
              <Loader2 className="w-6 h-6 text-white animate-spin" />
            </div>
          )}

          {!uploading && (
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Button
                size="sm"
                onClick={openFileDialog}
                className="bg-white/20 hover:bg-white/30 text-white border-0 text-xs"
              >
                <Upload className="w-3 h-3 mr-1" />
                Upload
              </Button>
            </div>
          )}
        </div>

        {uploading && (
          <div className="mt-2">
            <Progress value={uploadProgress} className="h-1" />
            <p className="text-xs text-gray-400 mt-1 text-center">{uploadProgress}%</p>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-2 p-2 bg-red-500/20 border border-red-500/30 rounded text-red-400 text-xs">{error}</div>
      )}
    </div>
  )
}
