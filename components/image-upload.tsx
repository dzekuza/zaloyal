"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Upload, X, ImageIcon, Loader2 } from "lucide-react"
import { storageService } from "@/lib/storage"

interface ImageUploadProps {
  onImageUploaded: (url: string) => void
  onImageRemoved?: () => void
  currentImage?: string
  questId?: string
  className?: string
  maxSizeMB?: number
  acceptedTypes?: string[]
  label?: string
}

export default function ImageUpload({
  onImageUploaded,
  onImageRemoved,
  currentImage,
  questId,
  className = "",
  maxSizeMB = 5,
  acceptedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"],
  label = "Upload Quest Image",
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const validateFile = (file: File): string | null => {
    // Check file type
    if (!acceptedTypes.includes(file.type)) {
      return `File type not supported. Please use: ${acceptedTypes.join(", ")}`
    }

    // Check file size
    const maxSizeBytes = maxSizeMB * 1024 * 1024
    if (file.size > maxSizeBytes) {
      return `File size too large. Maximum size is ${maxSizeMB}MB`
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

      const imageUrl = await storageService.uploadQuestImage(file, questId)

      clearInterval(progressInterval)
      setUploadProgress(100)

      if (imageUrl) {
        onImageUploaded(imageUrl)
        setTimeout(() => {
          setUploadProgress(0)
        }, 1000)
      } else {
        setError("Upload failed. Please try again.")
      }
    } catch (error) {
      console.error("Upload error:", error)
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
        accept={acceptedTypes.join(",")}
        onChange={handleFileSelect}
        className="hidden"
      />

      {currentImage && !uploading ? (
        <Card className="bg-[#0b4b34c4] border-white/20 overflow-hidden">
          <CardContent className="p-0 relative">
            <img src={currentImage || "/placeholder.svg"} alt="Quest image" className="w-full h-48 object-cover" />
            <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <Button size="sm" onClick={openFileDialog} className="bg-blue-500 hover:bg-blue-600 text-white">
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
          className={`bg-[#0b4b34c4] border-white/20 transition-all cursor-pointer ${
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
                  <Loader2 className="w-12 h-12 mx-auto text-blue-400 animate-spin" />
                  <div className="space-y-2">
                    <p className="text-white font-medium">Uploading image...</p>
                    <Progress value={uploadProgress} className="h-2" />
                    <p className="text-gray-400 text-sm">{uploadProgress}%</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="w-16 h-16 mx-auto bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center">
                    <ImageIcon className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <p className="text-white font-medium mb-2">{label}</p>
                    <p className="text-gray-400 text-sm mb-4">Drag and drop an image here, or click to browse</p>
                    <div className="text-xs text-gray-500">
                      <p>Supported formats: JPEG, PNG, GIF, WebP</p>
                      <p>Maximum size: {maxSizeMB}MB</p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="bg-white/10 border-white/20 text-white hover:bg-white/20"
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
