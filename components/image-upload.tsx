"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Upload, X, ImageIcon, Loader2 } from "lucide-react"

// Safe storage service import
let storageService: any = null
try {
  const { storageService: importedStorageService } = require("@/lib/storage")
  storageService = importedStorageService
} catch (error) {
  console.warn('Storage service not available:', error)
  // Create a fallback storage service
  storageService = {
    uploadQuestImage: async () => null,
    uploadProjectCover: async () => null,
    uploadProjectLogo: async () => null,
    uploadUserAvatar: async () => null,
    uploadQuestResponse: async () => null,
  }
}

interface ImageUploadProps {
  onImageUploaded: (url: string) => void
  onImageRemoved?: () => void
  currentImage?: string
  uploadType?: "quest" | "project-cover" | "project-logo" | "user-avatar" | "quest-response"
  entityId?: string // questId, projectId, userId, etc.
  className?: string
  maxSizeMB?: number
  acceptedTypes?: string[]
  label?: string
  height?: string
}

export default function ImageUpload({
  onImageUploaded,
  onImageRemoved,
  currentImage,
  uploadType = "quest",
  entityId,
  className = "",
  maxSizeMB,
  acceptedTypes,
  label,
  height = "h-48",
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Default settings based on upload type
  const getDefaultSettings = () => {
    switch (uploadType) {
      case "quest":
        return {
          maxSize: 5,
          types: ["image/jpeg", "image/png", "image/webp", "image/gif"],
          label: "Upload Quest Image"
        }
      case "project-cover":
        return {
          maxSize: 5,
          types: ["image/jpeg", "image/png", "image/webp"],
          label: "Upload Project Cover"
        }
      case "project-logo":
        return {
          maxSize: 2,
          types: ["image/jpeg", "image/png", "image/webp", "image/svg+xml"],
          label: "Upload Project Logo"
        }
      case "user-avatar":
        return {
          maxSize: 1,
          types: ["image/jpeg", "image/png", "image/webp"],
          label: "Upload Avatar"
        }
      case "quest-response":
        return {
          maxSize: 10,
          types: ["image/jpeg", "image/png", "image/webp", "video/mp4", "video/webm", "application/pdf"],
          label: "Upload Response"
        }
      default:
        return {
          maxSize: 5,
          types: ["image/jpeg", "image/png", "image/webp"],
          label: "Upload Image"
        }
    }
  }

  const defaultSettings = getDefaultSettings()
  const finalMaxSize = maxSizeMB || defaultSettings.maxSize
  const finalAcceptedTypes = acceptedTypes || defaultSettings.types
  const finalLabel = label || defaultSettings.label

  const validateFile = (file: File): string | null => {
    // Check file type
    if (!finalAcceptedTypes.includes(file.type)) {
      return `File type not supported. Please use: ${finalAcceptedTypes.join(", ")}`
    }

    // Check file size
    const maxSizeBytes = finalMaxSize * 1024 * 1024
    if (file.size > maxSizeBytes) {
      return `File size too large. Maximum size is ${finalMaxSize}MB`
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
      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + 10
        })
      }, 200)

      let imageUrl: string | null = null

      // Upload based on type
      switch (uploadType) {
        case "quest":
          imageUrl = await storageService.uploadQuestImage(file, entityId)
          break
        case "project-cover":
          if (!entityId) {
            throw new Error("Project ID is required for project cover upload")
          }
          console.log('DEBUG: Starting project cover upload for entity:', entityId)
          imageUrl = await storageService.uploadProjectCover(file, entityId)
          break
        case "project-logo":
          if (!entityId) {
            throw new Error("Project ID is required for project logo upload")
          }
          console.log('DEBUG: Starting project logo upload for entity:', entityId)
          imageUrl = await storageService.uploadProjectLogo(file, entityId)
          break
        case "user-avatar":
          if (!entityId) {
            throw new Error("User ID is required for avatar upload")
          }
          imageUrl = await storageService.uploadUserAvatar(file, entityId)
          break
        case "quest-response":
          if (!entityId) {
            throw new Error("Quest ID is required for response upload")
          }
          imageUrl = await storageService.uploadQuestResponse(file, entityId, "temp-user-id")
          break
        default:
          imageUrl = await storageService.uploadQuestImage(file, entityId)
      }

      clearInterval(progressInterval)
      setUploadProgress(100)

      if (imageUrl) {
        console.log('DEBUG: Upload successful, URL:', imageUrl)
        onImageUploaded(imageUrl)
        setTimeout(() => {
          setUploadProgress(0)
        }, 1000)
      } else {
        console.error('DEBUG: Upload failed - no URL returned')
        
        // Try to provide more specific error message
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          setError("Upload failed. Please ensure you are signed in and try again.")
        } else {
          setError("Upload failed. Please check your file size and format, then try again.")
        }
      }
    } catch (error) {
      console.error("Upload error:", error)
      setError(error instanceof Error ? error.message : "Upload failed. Please try again.")
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

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault()
    setDragOver(false)

    const file = event.dataTransfer.files[0]
    if (file) {
      handleFileUpload(file)
    }
  }

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault()
    setDragOver(false)
  }

  const removeImage = () => {
    onImageRemoved?.()
    setError(null)
  }

  const openFileDialog = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className={className}>
      <input
        ref={fileInputRef}
        type="file"
        accept={finalAcceptedTypes.join(",")}
        onChange={handleFileSelect}
        className="hidden"
      />

      {currentImage && !uploading ? (
        <Card className="bg-[#111111] border-[#282828] overflow-hidden">
          <CardContent className="p-0 relative">
            <img 
              src={currentImage || "/placeholder.svg"} 
              alt="Uploaded image" 
              className={`w-full ${height} object-cover`} 
            />
            <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <Button size="sm" onClick={openFileDialog} className="bg-green-600 hover:bg-green-700 text-white">
                <Upload className="w-4 h-4 mr-2" />
                Replace
              </Button>
              {onImageRemoved && (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={removeImage}
                  className="bg-red-500 hover:bg-red-600 text-white"
                >
                  <X className="w-4 h-4 mr-2" />
                  Remove
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card
          className={`bg-[#232323] border-2 border-dashed border-[#444] transition-all cursor-pointer ${
            dragOver ? "border-green-400 bg-green-500/20" : "hover:border-white/30"
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={!uploading ? openFileDialog : undefined}
        >
          <CardContent className="p-8">
            <div className="text-center">
              {uploading ? (
                <div className="space-y-4">
                  <Loader2 className="w-12 h-12 mx-auto text-green-400 animate-spin" />
                  <div className="space-y-2">
                    <p className="text-white font-medium">Uploading image...</p>
                    <Progress value={uploadProgress} className="h-2" />
                    <p className="text-gray-400 text-sm">{uploadProgress}%</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="w-16 h-16 mx-auto bg-[#282828] rounded-full flex items-center justify-center">
                    <ImageIcon className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <p className="text-white font-medium mb-2">{finalLabel}</p>
                    <p className="text-gray-400 text-sm mb-4">Drag and drop an image here, or click to browse</p>
                    <div className="text-xs text-gray-500">
                      <p>Supported formats: {finalAcceptedTypes.map(type => type.split('/')[1].toUpperCase()).join(", ")}</p>
                      <p>Maximum size: {finalMaxSize}MB</p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="bg-[#181818] border-[#282828] text-white hover:bg-[#282828]"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Choose File
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {error && (
        <div className="mt-3 p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-sm">{error}</div>
      )}
    </div>
  )
}
