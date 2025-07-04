import { supabase } from "./supabase"

export class StorageService {
  private bucketName = "publicprofile"

  async uploadQuestImage(file: File, questId?: string): Promise<string | null> {
    try {
      // Generate unique filename
      const fileExt = file.name.split(".").pop()
      const fileName = `quest-images/${questId || Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`

      // Upload file
      const { data, error } = await supabase.storage.from(this.bucketName).upload(fileName, file, {
        cacheControl: "3600",
        upsert: false,
      })

      if (error) {
        console.error("Upload error:", error)
        return null
      }

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from(this.bucketName).getPublicUrl(fileName)

      return publicUrl
    } catch (error) {
      console.error("Storage service error:", error)
      return null
    }
  }

  async uploadUserAvatar(file: File, userId: string): Promise<string | null> {
    try {
      const fileExt = file.name.split(".").pop()
      const fileName = `profile/${userId}-${Date.now()}.${fileExt}`

      // Upload file (upsert to replace existing)
      const { data, error } = await supabase.storage.from(this.bucketName).upload(fileName, file, {
        cacheControl: "3600",
        upsert: true,
      })

      if (error) {
        console.error("Avatar upload error:", error)
        return null
      }

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from(this.bucketName).getPublicUrl(fileName)

      return publicUrl
    } catch (error) {
      console.error("Avatar upload error:", error)
      return null
    }
  }

  async deleteFile(filePath: string): Promise<boolean> {
    try {
      const { error } = await supabase.storage.from(this.bucketName).remove([filePath])

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

  getPublicUrl(filePath: string): string {
    const {
      data: { publicUrl },
    } = supabase.storage.from(this.bucketName).getPublicUrl(filePath)

    return publicUrl
  }
}

export const storageService = new StorageService()
