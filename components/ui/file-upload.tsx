'use client'

import React, { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, X, File, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface FileUploadProps {
  onFileUpload: (file: File) => void
  onFileRemove: () => void
  uploadedFile?: File | null
  uploadedFileUrl?: string | null
  className?: string
  accept?: string
  maxSize?: number
}

export function FileUpload({
  onFileUpload,
  onFileRemove,
  uploadedFile,
  uploadedFileUrl,
  className,
  accept = "*/*",
  maxSize = 50 * 1024 * 1024 // 50MB default
}: FileUploadProps) {
  const [isDragActive, setIsDragActive] = useState(false)

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      onFileUpload(acceptedFiles[0])
    }
  }, [onFileUpload])

  const { getRootProps, getInputProps, isDragReject } = useDropzone({
    onDrop,
    accept: accept ? { [accept]: [] } : undefined,
    maxSize,
    multiple: false
  })

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className={cn("space-y-4", className)}>
      {!uploadedFile && !uploadedFileUrl ? (
        <div
          {...getRootProps()}
          className={cn(
            "border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer",
            isDragActive
              ? "border-green-400 bg-green-400/10"
              : isDragReject
              ? "border-red-400 bg-red-400/10"
              : "border-[#282828] bg-[#111111] hover:border-[#404040]"
          )}
        >
          <input {...getInputProps()} />
          <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <div className="space-y-2">
            <p className="text-white font-medium">
              {isDragActive ? "Drop the file here" : "Drag & drop a file here"}
            </p>
            <p className="text-gray-400 text-sm">
              or click to select a file
            </p>
            <p className="text-gray-500 text-xs">
              Max size: {formatFileSize(maxSize)}
            </p>
          </div>
        </div>
      ) : (
        <div className="border border-[#282828] rounded-lg p-4 bg-[#111111]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <File className="h-8 w-8 text-green-400" />
              <div>
                <p className="text-white font-medium">
                  {uploadedFile?.name || 'Uploaded File'}
                </p>
                {uploadedFile && (
                  <p className="text-gray-400 text-sm">
                    {formatFileSize(uploadedFile.size)}
                  </p>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              {uploadedFileUrl && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.open(uploadedFileUrl, '_blank')}
                  className="border-[#282828] text-gray-300 hover:bg-[#1a1a1a]"
                >
                  <Download className="w-4 h-4 mr-1" />
                  Download
                </Button>
              )}
              <Button
                size="sm"
                variant="destructive"
                onClick={onFileRemove}
                className="h-8 w-8 p-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 