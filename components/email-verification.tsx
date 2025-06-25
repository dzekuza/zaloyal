"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Mail, ArrowLeft, CheckCircle } from "lucide-react"
import { supabase } from "@/lib/supabase"

interface EmailVerificationProps {
  email: string
  onVerified: () => void
  onBack: () => void
}

export default function EmailVerification({ email, onVerified, onBack }: EmailVerificationProps) {
  const [code, setCode] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [resending, setResending] = useState(false)
  const [countdown, setCountdown] = useState(60)

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown])

  const handleVerify = async () => {
    if (code.length !== 5) {
      setError("Please enter a 5-digit code")
      return
    }

    setLoading(true)
    setError("")

    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: code,
        type: "signup",
      })

      if (error) throw error

      onVerified()
    } catch (error: any) {
      setError(error.message || "Invalid verification code")
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    setResending(true)
    setError("")

    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
      })

      if (error) throw error

      setCountdown(60)
    } catch (error: any) {
      setError(error.message || "Failed to resend code")
    } finally {
      setResending(false)
    }
  }

  const handleCodeChange = (value: string) => {
    // Only allow digits and limit to 5 characters
    const digits = value.replace(/\D/g, "").slice(0, 5)
    setCode(digits)
    setError("")
  }

  return (
    <Card className="bg-gradient-to-br from-white/10 to-white/5 border-white/20 backdrop-blur-sm w-full max-w-md">
      <CardHeader className="text-center">
        <div className="w-16 h-16 mx-auto bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mb-4">
          <Mail className="w-8 h-8 text-white" />
        </div>
        <CardTitle className="text-white">Verify Your Email</CardTitle>
        <CardDescription className="text-gray-300">
          We've sent a 5-digit verification code to
          <br />
          <span className="font-medium text-white">{email}</span>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <Label htmlFor="code" className="text-white text-center block mb-3">
            Enter Verification Code
          </Label>
          <Input
            id="code"
            value={code}
            onChange={(e) => handleCodeChange(e.target.value)}
            placeholder="12345"
            className="bg-white/10 border-white/20 text-white placeholder:text-gray-400 text-center text-2xl font-mono tracking-widest"
            maxLength={5}
          />
          {error && <p className="text-red-400 text-sm mt-2 text-center">{error}</p>}
        </div>

        <Button
          onClick={handleVerify}
          disabled={loading || code.length !== 5}
          className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white border-0"
        >
          {loading ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Verifying...
            </div>
          ) : (
            <>
              <CheckCircle className="w-4 h-4 mr-2" />
              Verify Email
            </>
          )}
        </Button>

        <div className="text-center space-y-2">
          <p className="text-gray-400 text-sm">Didn't receive the code?</p>
          <Button
            variant="ghost"
            onClick={handleResend}
            disabled={resending || countdown > 0}
            className="text-blue-400 hover:text-blue-300 hover:bg-white/10"
          >
            {resending ? "Sending..." : countdown > 0 ? `Resend in ${countdown}s` : "Resend Code"}
          </Button>
        </div>

        <Button variant="ghost" onClick={onBack} className="w-full text-gray-400 hover:text-white hover:bg-white/10">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Sign Up
        </Button>
      </CardContent>
    </Card>
  )
}
