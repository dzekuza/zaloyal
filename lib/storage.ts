import { supabase } from "./supabase"

export class StorageService {
  // Storage bucket names for different content types
  private readonly BUCKETS = {
    QUEST_IMAGES: "quest-images",
    PROJECT_COVERS: "project-covers", 
    PROJECT_LOGOS: "project-logos",
    USER_AVATARS: "user-avatars",
    QUEST_RESPONSES: "quest-responses"
  }

  // Generate unique filename with timestamp and random string
  private generateUniqueFilename(originalName: string, prefix: string = ""): string {
    const fileExt = originalName.split(".").pop()?.toLowerCase() || "jpg"
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 15)
    return `${prefix}${timestamp}-${random}.${fileExt}`
  }

  // Validate file before upload
  private validateFile(file: File, maxSizeMB: number = 5, allowedTypes: string[] = ["image/jpeg", "image/png", "image/webp"]): string | null {
    // Check file type
    if (!allowedTypes.includes(file.type)) {
      return `File type not supported. Please use: ${allowedTypes.join(", ")}`
    }

    // Check file size
    const maxSizeBytes = maxSizeMB * 1024 * 1024
    if (file.size > maxSizeBytes) {
      return `File size too large. Maximum size is ${maxSizeMB}MB`
    }

    return null
  }

  // Upload quest image
  async uploadQuestImage(file: File, questId?: string): Promise<string | null> {
    try {
      const validationError = this.validateFile(file, 5, ["image/jpeg", "image/png", "image/webp", "image/gif"])
      if (validationError) {
        console.error("File validation error:", validationError)
        return null
      }

      // Check if user is authenticated
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        console.error("User not authenticated for upload")
        return null
      }

      const fileName = questId 
        ? `quests/${questId}/cover.${file.name.split(".").pop()?.toLowerCase()}`
        : `quests/temp/${user.id}/${this.generateUniqueFilename(file.name, "quest-")}`

      const { data, error } = await supabase.storage
        .from(this.BUCKETS.QUEST_IMAGES)
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: true,
        })

      if (error) {
        console.error("Quest image upload error:", error)
        return null
      }

      const { data: { publicUrl } } = supabase.storage
        .from(this.BUCKETS.QUEST_IMAGES)
        .getPublicUrl(fileName)

      return publicUrl
    } catch (error) {
      console.error("Quest image upload error:", error)
      return null
    }
  }

  // Upload project cover image
  async uploadProjectCover(file: File, projectId: string): Promise<string | null> {
    try {
      const validationError = this.validateFile(file, 5, ["image/jpeg", "image/png", "image/webp"])
      if (validationError) {
        console.error("File validation error:", validationError)
        return null
      }

      // Check if user is authenticated
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        console.error("User not authenticated for upload")
        return null
      }

      // Use a temporary path for new projects
      const fileName = projectId === "temp" 
        ? `temp/${user.id}/${Date.now()}-cover.${file.name.split(".").pop()?.toLowerCase()}`
        : `projects/${projectId}/cover.${file.name.split(".").pop()?.toLowerCase()}`

      const { data, error } = await supabase.storage
        .from(this.BUCKETS.PROJECT_COVERS)
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: true,
        })

      if (error) {
        console.error("Project cover upload error:", error)
        return null
      }

      const { data: { publicUrl } } = supabase.storage
        .from(this.BUCKETS.PROJECT_COVERS)
        .getPublicUrl(fileName)

      return publicUrl
    } catch (error) {
      console.error("Project cover upload error:", error)
      return null
    }
  }

  // Upload project logo
  async uploadProjectLogo(file: File, projectId: string): Promise<string | null> {
    try {
      const validationError = this.validateFile(file, 2, ["image/jpeg", "image/png", "image/webp", "image/svg+xml"])
      if (validationError) {
        console.error("File validation error:", validationError)
        return null
      }

      // Check if user is authenticated
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        console.error("User not authenticated for upload")
        return null
      }

      // Use a temporary path for new projects
      const fileName = projectId === "temp" 
        ? `temp/${user.id}/${Date.now()}-logo.${file.name.split(".").pop()?.toLowerCase()}`
        : `projects/${projectId}/logo.${file.name.split(".").pop()?.toLowerCase()}`

      const { data, error } = await supabase.storage
        .from(this.BUCKETS.PROJECT_LOGOS)
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: true,
        })

      if (error) {
        console.error("Project logo upload error:", error)
        return null
      }

      const { data: { publicUrl } } = supabase.storage
        .from(this.BUCKETS.PROJECT_LOGOS)
        .getPublicUrl(fileName)

      return publicUrl
    } catch (error) {
      console.error("Project logo upload error:", error)
      return null
    }
  }

  // Upload user avatar
  async uploadUserAvatar(file: File, userId: string): Promise<string | null> {
    try {
      const validationError = this.validateFile(file, 1, ["image/jpeg", "image/png", "image/webp"])
      if (validationError) {
        console.error("File validation error:", validationError)
        return null
      }

      // Check if user is authenticated
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        console.error("User not authenticated for upload")
        return null
      }

      const fileName = `users/${userId}/avatar.${file.name.split(".").pop()?.toLowerCase()}`

      const { data, error } = await supabase.storage
        .from(this.BUCKETS.USER_AVATARS)
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: true,
        })

      if (error) {
        console.error("User avatar upload error:", error)
        return null
      }

      const { data: { publicUrl } } = supabase.storage
        .from(this.BUCKETS.USER_AVATARS)
        .getPublicUrl(fileName)

      return publicUrl
    } catch (error) {
      console.error("User avatar upload error:", error)
      return null
    }
  }

  // Upload quest/task response (for private responses)
  async uploadQuestResponse(file: File, questId: string, userId: string, taskId?: string): Promise<string | null> {
    try {
      const validationError = this.validateFile(file, 10, [
        "image/jpeg", "image/png", "image/webp", 
        "video/mp4", "video/webm", 
        "application/pdf"
      ])
      if (validationError) {
        console.error("File validation error:", validationError)
        return null
      }

      // Check if user is authenticated
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        console.error("User not authenticated for upload")
        return null
      }

      const timestamp = Date.now()
      const fileName = taskId 
        ? `quests/${questId}/responses/${userId}/${taskId}-${timestamp}.${file.name.split(".").pop()?.toLowerCase()}`
        : `quests/${questId}/responses/${userId}/${timestamp}.${file.name.split(".").pop()?.toLowerCase()}`

      const { data, error } = await supabase.storage
        .from(this.BUCKETS.QUEST_RESPONSES)
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: false,
        })

      if (error) {
        console.error("Quest response upload error:", error)
        return null
      }

      // For private responses, return the path instead of public URL
      return `${this.BUCKETS.QUEST_RESPONSES}/${fileName}`
    } catch (error) {
      console.error("Quest response upload error:", error)
      return null
    }
  }

  // Delete file from storage
  async deleteFile(filePath: string, bucketName?: string): Promise<boolean> {
    try {
      const bucket = bucketName || this.BUCKETS.QUEST_IMAGES
      const { error } = await supabase.storage.from(bucket).remove([filePath])

      if (error) {
        console.error("Delete error:", error)
        return false
      }

      return true
    } catch (error) {
      console.error("Delete service error:", error)
      return false
    }
  }

  // Get public URL for a file
  getPublicUrl(filePath: string, bucketName?: string): string {
    const bucket = bucketName || this.BUCKETS.QUEST_IMAGES
    const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(filePath)
    return publicUrl
  }

  // Get storage statistics
  async getStorageStats(): Promise<any> {
    try {
      const stats: Record<string, any> = {}
      for (const [key, bucketName] of Object.entries(this.BUCKETS)) {
        const { data, error } = await supabase.storage.from(bucketName).list('', {
          limit: 1000,
          offset: 0,
        })
        
        if (!error && data) {
          stats[key] = {
            bucket: bucketName,
            fileCount: data.length,
            totalSize: data.reduce((sum, file) => sum + (file.metadata?.size || 0), 0)
          }
        }
      }
      return stats
    } catch (error) {
      console.error("Storage stats error:", error)
      return null
    }
  }

  // Move temporary image to actual project folder
  async moveTempImage(tempUrl: string, projectId: string, type: 'logo' | 'cover'): Promise<string | null> {
    try {
      // Extract the file path from the URL
      const urlParts = tempUrl.split('/')
      const fileName = urlParts[urlParts.length - 1]
      const tempPath = `temp/${fileName}`
      const newPath = `projects/${projectId}/${type}.${fileName.split('.').pop()}`

      // Download the file from temp location
      const { data: fileData, error: downloadError } = await supabase.storage
        .from(type === 'logo' ? this.BUCKETS.PROJECT_LOGOS : this.BUCKETS.PROJECT_COVERS)
        .download(tempPath)

      if (downloadError || !fileData) {
        console.error("Error downloading temp file:", downloadError)
        return null
      }

      // Upload to new location
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(type === 'logo' ? this.BUCKETS.PROJECT_LOGOS : this.BUCKETS.PROJECT_COVERS)
        .upload(newPath, fileData, {
          cacheControl: "3600",
          upsert: true,
        })

      if (uploadError) {
        console.error("Error uploading to new location:", uploadError)
        return null
      }

      // Get the new public URL
      const { data: { publicUrl } } = supabase.storage
        .from(type === 'logo' ? this.BUCKETS.PROJECT_LOGOS : this.BUCKETS.PROJECT_COVERS)
        .getPublicUrl(newPath)

      // Delete the temp file
      await supabase.storage
        .from(type === 'logo' ? this.BUCKETS.PROJECT_LOGOS : this.BUCKETS.PROJECT_COVERS)
        .remove([tempPath])

      return publicUrl
    } catch (error) {
      console.error("Error moving temp image:", error)
      return null
    }
  }

  // Clean up old temporary files
  async cleanupTempFiles(): Promise<boolean> {
    try {
      const { data, error } = await supabase.storage
        .from(this.BUCKETS.QUEST_IMAGES)
        .list('quests/temp', {
          limit: 1000,
          offset: 0,
        })

      if (error) {
        console.error("Cleanup error:", error)
        return false
      }

      // Delete files older than 24 hours
      const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000)
      const oldFiles = data?.filter(file => {
        const fileTime = parseInt(file.name.split('-')[0]) || 0
        return fileTime < oneDayAgo
      }) || []

      if (oldFiles.length > 0) {
        const filePaths = oldFiles.map(file => `quests/temp/${file.name}`)
        const { error: deleteError } = await supabase.storage
          .from(this.BUCKETS.QUEST_IMAGES)
          .remove(filePaths)

        if (deleteError) {
          console.error("Cleanup delete error:", deleteError)
          return false
        }
      }

      return true
    } catch (error) {
      console.error("Cleanup error:", error)
      return false
    }
  }
}

export const storageService = new StorageService()
