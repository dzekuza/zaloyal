"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Mail, Eye, EyeOff, User, CheckCircle, ArrowLeft, ArrowRight, Shield } from "lucide-react"
import { supabase } from "@/lib/supabase"

interface EmailAuthProps {
  onSuccess: (user: any) => void
  onError: (error: string) => void
  onNavigate?: () => void
}

type AuthStep = 'login' | 'register' | 'verify' | 'success'

export default function EmailAuth({ onSuccess, onError, onNavigate }: EmailAuthProps) {
  const [currentStep, setCurrentStep] = useState<AuthStep>('login')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [verificationEmail, setVerificationEmail] = useState("")
  const [otpCode, setOtpCode] = useState("")
  const [isVerificationFromLogin, setIsVerificationFromLogin] = useState(false)
  const [loginForm, setLoginForm] = useState({ email: "", password: "" })
  const [registerForm, setRegisterForm] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    username: "",
  })

  const handleLogin = async () => {
    if (!loginForm.email || !loginForm.password) {
      onError("Please fill in all fields")
      return
    }

    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginForm.email,
        password: loginForm.password,
      })

      if (error) {
        // Check if the error is due to unverified email
        if (error.message.includes('Email not confirmed') || error.message.includes('Email not verified')) {
          // User exists but email not verified - show verification step
          setVerificationEmail(loginForm.email)
          setCurrentStep('verify')
          setLoading(false)
          return
        }
        throw error
      }

              // Check if user email is verified
        const { user } = data;
        if (!user.email_confirmed_at) {
          // Email not verified - show verification step
          setVerificationEmail(loginForm.email)
          setIsVerificationFromLogin(true)
          setCurrentStep('verify')
          setLoading(false)
          return
        }

      // Email is verified - proceed with normal login
      // Let the database trigger handle user profile updates automatically
      const { data: profile } = await supabase.from("users").select("*").eq("id", user.id).single()

      onSuccess({ ...data.user, profile })
      // Let parent component handle navigation
      if (onNavigate) {
        onNavigate()
      }
    } catch (error: any) {
      onError(error.message || "Login failed")
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async () => {
    if (!registerForm.email || !registerForm.password || !registerForm.username) {
      onError("Please fill in all fields")
      return
    }

    if (registerForm.password !== registerForm.confirmPassword) {
      onError("Passwords don't match")
      return
    }

    if (registerForm.password.length < 6) {
      onError("Password must be at least 6 characters")
      return
    }
    setLoading(true)
    try {
      // Register with Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email: registerForm.email,
        password: registerForm.password,
        options: {
          data: {
            username: registerForm.username,
          },
        },
      })
      if (error) {
        console.error('Signup error:', error);
        throw error;
      }
      if (data.user) {
        // Move to verification step
        setVerificationEmail(registerForm.email)
        setIsVerificationFromLogin(false)
        setCurrentStep('verify')
        // Don't call onSuccess yet - wait for verification
      } else {
        throw new Error("User not created");
      }
    } catch (error: any) {
      console.error('Registration failed:', error);
      onError(error.message || "Registration failed")
    } finally {
      setLoading(false)
    }
  }

  const handleOtpVerification = async () => {
    if (!otpCode || otpCode.length !== 6) {
      onError("Please enter a valid 6-digit code")
      return
    }

    setLoading(true)
    try {
      // Try signup verification
      const { data, error } = await supabase.auth.verifyOtp({
        email: verificationEmail,
        token: otpCode,
        type: 'signup'
      })

      if (error) throw error

      if (data.user) {
        // Fetch the user profile after confirmation
        const { data: profile } = await supabase.from("users").select("*").eq("id", data.user.id).single()
        setCurrentStep('success')
        
        // Call onSuccess only after verification is complete
        onSuccess({ ...data.user, profile })
        
        // Let parent component handle navigation
        if (onNavigate) {
          setTimeout(() => {
            onNavigate()
          }, 2000)
        }
      }
    } catch (error: any) {
      onError(error.message || "Verification failed")
    } finally {
      setLoading(false)
    }
  }

  const handleResendOtp = async () => {
    setLoading(true)
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: verificationEmail,
      })

      if (error) throw error

      onError("Verification code resent! Check your email.")
    } catch (error: any) {
      onError(error.message || "Failed to resend code")
    } finally {
      setLoading(false)
    }
  }

  const handleBackToRegister = () => {
    setCurrentStep('register')
    setOtpCode("")
    setVerificationEmail("")
    // Clear any previous error
    onError("")
  }

  const handleBackToLogin = () => {
    setCurrentStep('login')
    setOtpCode("")
    setVerificationEmail("")
  }

  // Success step
  if (currentStep === 'success') {
    return (
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center">
          <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
            <CheckCircle className="w-6 h-6 text-white" />
          </div>
        </div>
        <div>
          <h2 className="text-xl font-semibold text-white mb-2">Account Created Successfully!</h2>
          <p className="text-gray-300 text-sm">Your email has been verified. Redirecting to dashboard...</p>
        </div>
        <div className="animate-spin rounded-full border-b-2 border-green-500 h-6 w-6 mx-auto"></div>
      </div>
    )
  }

  // Verification step
  if (currentStep === 'verify') {
    return (
      <div className="space-y-4">
        {/* Compact step indicator */}
        <div className="flex items-center justify-center space-x-2 mb-4">
          <div className="flex items-center">
            <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
              <CheckCircle className="w-3 h-3 text-white" />
            </div>
            <span className="ml-1 text-xs text-green-400">
              {isVerificationFromLogin ? "Login" : "Registration"}
            </span>
          </div>
          <ArrowRight className="w-3 h-3 text-gray-400" />
          <div className="flex items-center">
            <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
              <Shield className="w-3 h-3 text-white" />
            </div>
            <span className="ml-1 text-xs text-blue-400">Verification</span>
          </div>
          <ArrowRight className="w-3 h-3 text-gray-400" />
          <div className="flex items-center">
            <div className="w-6 h-6 bg-gray-500 rounded-full flex items-center justify-center">
              <CheckCircle className="w-3 h-3 text-white" />
            </div>
            <span className="ml-1 text-xs text-gray-400">Complete</span>
          </div>
        </div>

        <div className="text-center mb-4">
          <div className="text-white flex items-center justify-center gap-2 text-lg font-semibold">
            <Shield className="w-4 h-4" />
            Verify Your Email
          </div>
          <div className="text-gray-300 text-sm mt-1">
            {isVerificationFromLogin 
              ? "Please verify your email to complete login. Enter the 6-digit code sent to " + verificationEmail
              : "Enter the 6-digit code sent to " + verificationEmail
            }
          </div>
        </div>
        
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="otp-code" className="text-white text-sm">
              Verification Code
            </Label>
            <Input
              id="otp-code"
              type="text"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="Enter 6-digit code"
              className="bg-white/10 border-white/20 text-white placeholder:text-gray-400 text-center text-lg tracking-widest"
              maxLength={6}
            />
          </div>
          
          <Button
            onClick={handleOtpVerification}
            disabled={loading || otpCode.length !== 6}
            className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white border-0"
          >
            {loading ? "Verifying..." : "Verify Email"}
          </Button>
          
          <div className="text-center space-y-2">
            <Button
              variant="ghost"
              onClick={handleResendOtp}
              disabled={loading}
              className="text-gray-300 hover:text-white text-sm"
            >
              Resend Code
            </Button>
            <br />
            <Button
              variant="ghost"
              onClick={isVerificationFromLogin ? handleBackToLogin : handleBackToRegister}
              className="text-gray-400 hover:text-white flex items-center gap-2 text-sm"
            >
              <ArrowLeft className="w-3 h-3" />
              {isVerificationFromLogin ? "Back to Login" : "Back to Registration"}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Compact step indicator for login/register */}
      <div className="flex items-center justify-center space-x-2 mb-4">
        <div className="flex items-center">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
            currentStep === 'login' ? 'bg-blue-500' : 'bg-gray-500'
          }`}>
            <Mail className="w-3 h-3 text-white" />
          </div>
          <span className={`ml-1 text-xs ${
            currentStep === 'login' ? 'text-blue-400' : 'text-gray-400'
          }`}>Authentication</span>
        </div>
        <ArrowRight className="w-3 h-3 text-gray-400" />
        <div className="flex items-center">
          <div className="w-6 h-6 bg-gray-500 rounded-full flex items-center justify-center">
            <Shield className="w-3 h-3 text-white" />
          </div>
          <span className="ml-1 text-xs text-gray-400">Verification</span>
        </div>
        <ArrowRight className="w-3 h-3 text-gray-400" />
        <div className="flex items-center">
          <div className="w-6 h-6 bg-gray-500 rounded-full flex items-center justify-center">
            <CheckCircle className="w-3 h-3 text-white" />
          </div>
          <span className="ml-1 text-xs text-gray-400">Complete</span>
        </div>
      </div>

      <div className="text-center mb-4">
        <div className="text-white flex items-center justify-center gap-2 text-lg font-semibold">
          <Mail className="w-4 h-4" />
          Email Authentication
        </div>
        <div className="text-gray-300 text-sm mt-1">Sign in or create an account with email</div>
      </div>
      
      <Tabs defaultValue="login" className="space-y-3">
        <TabsList className="grid w-full grid-cols-2 bg-white/10">
          <TabsTrigger 
            value="login" 
            className="data-[state=active]:bg-white/20 text-white text-sm"
            onClick={() => setCurrentStep('login')}
          >
            Sign In
          </TabsTrigger>
          <TabsTrigger 
            value="register" 
            className="data-[state=active]:bg-white/20 text-white text-sm"
            onClick={() => setCurrentStep('register')}
          >
            Sign Up
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="login" className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="login-email" className="text-white flex items-center gap-2 text-sm">
              <Mail className="w-3 h-3" />
              Email
            </Label>
            <Input
              id="login-email"
              type="email"
              value={loginForm.email}
              onChange={(e) => setLoginForm((prev) => ({ ...prev, email: e.target.value }))}
              placeholder="Enter your email"
              className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="login-password" className="text-white flex items-center gap-2 text-sm">
              <Eye className="w-3 h-3" />
              Password
            </Label>
            <div className="relative">
              <Input
                id="login-password"
                type={showPassword ? "text" : "password"}
                value={loginForm.password}
                onChange={(e) => setLoginForm((prev) => ({ ...prev, password: e.target.value }))}
                placeholder="Enter your password"
                className="bg-white/10 border-white/20 text-white placeholder:text-gray-400 pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 text-gray-400 hover:text-white"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
              </Button>
            </div>
          </div>
          <Button
            onClick={handleLogin}
            disabled={loading}
            className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white border-0"
          >
            {loading ? "Signing In..." : "Sign In"}
          </Button>
        </TabsContent>
        
        <TabsContent value="register" className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="register-username" className="text-white flex items-center gap-2 text-sm">
              <User className="w-3 h-3" />
              Username
            </Label>
            <Input
              id="register-username"
              value={registerForm.username}
              onChange={(e) => setRegisterForm((prev) => ({ ...prev, username: e.target.value }))}
              placeholder="Choose a username"
              className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="register-email" className="text-white flex items-center gap-2 text-sm">
              <Mail className="w-3 h-3" />
              Email
            </Label>
            <Input
              id="register-email"
              type="email"
              value={registerForm.email}
              onChange={(e) => setRegisterForm((prev) => ({ ...prev, email: e.target.value }))}
              placeholder="Enter your email"
              className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="register-password" className="text-white flex items-center gap-2 text-sm">
              <Eye className="w-3 h-3" />
              Password
            </Label>
            <div className="relative">
              <Input
                id="register-password"
                type={showPassword ? "text" : "password"}
                value={registerForm.password}
                onChange={(e) => setRegisterForm((prev) => ({ ...prev, password: e.target.value }))}
                placeholder="Create a password"
                className="bg-white/10 border-white/20 text-white placeholder:text-gray-400 pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 text-gray-400 hover:text-white"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password" className="text-white flex items-center gap-2 text-sm">
              <Eye className="w-3 h-3" />
              Confirm Password
            </Label>
            <Input
              id="confirm-password"
              type={showPassword ? "text" : "password"}
              value={registerForm.confirmPassword}
              onChange={(e) => setRegisterForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
              placeholder="Confirm your password"
              className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
            />
          </div>
          <Button
            onClick={handleRegister}
            disabled={loading}
            className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white border-0"
          >
            {loading ? "Creating Account..." : "Create Account"}
          </Button>
        </TabsContent>
      </Tabs>
    </div>
  )
}
