"use client"

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { useAuth } from './auth-provider-wrapper'
import { Mail, User, Lock, Eye, EyeOff, ArrowLeft } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface AuthDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultTab?: 'signin' | 'signup'
}

type AuthStep = 'signin' | 'signup' | 'verify' | 'setup-password'

export default function AuthDialog({ open, onOpenChange, defaultTab = 'signin' }: AuthDialogProps) {
  const [activeTab, setActiveTab] = useState(defaultTab)
  const [currentStep, setCurrentStep] = useState<AuthStep>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [username, setUsername] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [xLoading, setXLoading] = useState(false)
  const [discordLoading, setDiscordLoading] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [resending, setResending] = useState(false)
  const [settingPassword, setSettingPassword] = useState(false)
  
  const { signInWithEmail, signUpWithEmail, signInWithX, signInWithDiscord, verifyEmail, resendVerificationEmail, setPassword: setUserPassword, user } = useAuth()
  const { toast } = useToast()

  // Close dialog when user is authenticated
  useEffect(() => {
    if (user && open) {
      console.log('DEBUG: User authenticated, closing auth dialog')
      onOpenChange(false)
    }
  }, [user, open, onOpenChange])

  // Clear form when switching tabs
  useEffect(() => {
    if (!open) {
      setEmail('')
      setPassword('')
      setConfirmPassword('')
      setUsername('')
      setVerificationCode('')
      setNewPassword('')
      setConfirmNewPassword('')
      setShowPassword(false)
      setShowConfirmPassword(false)
      setShowNewPassword(false)
      setShowConfirmNewPassword(false)
      setCurrentStep('signin')
    }
  }, [open])

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const handleVerification = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!verificationCode || verificationCode.length !== 6) {
      toast({
        title: "Error",
        description: "Please enter a valid 6-digit verification code",
        variant: "destructive",
      })
      return
    }

    setVerifying(true)
    try {
      await verifyEmail(email, verificationCode)
      setCurrentStep('signin')
      setVerificationCode('')
      toast({
        title: "Success",
        description: "Email verified! You can now sign in.",
      })
    } catch (error) {
      // Error is handled by the auth provider
    } finally {
      setVerifying(false)
    }
  }

  const handleResendVerification = async () => {
    if (!email) {
      toast({
        title: "Error",
        description: "Email is required to resend verification",
        variant: "destructive",
      })
      return
    }

    setResending(true)
    try {
      await resendVerificationEmail(email)
    } catch (error) {
      // Error is handled by the auth provider
    } finally {
      setResending(false)
    }
  }

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      })
      return
    }

    if (!validateEmail(email)) {
      toast({
        title: "Error",
        description: "Please enter a valid email address",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      await signInWithEmail(email, password)
      onOpenChange(false)
      setEmail('')
      setPassword('')
    } catch (error: any) {
      // Check if error is due to unverified email
      if (error.message?.includes('Email not confirmed') || 
          error.message?.includes('unverified') ||
          error.message?.includes('not confirmed')) {
        setCurrentStep('verify')
        setPassword('')
        // Don't show toast here - the verification step will handle the UI
      } else if (error.message?.includes('Invalid login credentials') ||
                 error.message?.includes('Invalid email or password')) {
        // Check if this might be an OAuth user without password
        setCurrentStep('setup-password')
        setPassword('')
        toast({
          title: "No Password Set",
          description: "This email was registered via social login. Please set a password to continue.",
          variant: "destructive",
        })
      } else {
        // For other errors, let the auth provider handle the toast
        console.error('Sign in error:', error)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password || !confirmPassword || !username) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      })
      return
    }

    if (!validateEmail(email)) {
      toast({
        title: "Error",
        description: "Please enter a valid email address",
        variant: "destructive",
      })
      return
    }

    if (password !== confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive",
      })
      return
    }

    if (password.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters",
        variant: "destructive",
      })
      return
    }

    if (username.length < 3) {
      toast({
        title: "Error",
        description: "Username must be at least 3 characters",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      await signUpWithEmail(email, password, username)
      setCurrentStep('verify')
      setPassword('')
      setConfirmPassword('')
      setUsername('')
    } catch (error) {
      // Error is handled by the auth provider
    } finally {
      setLoading(false)
    }
  }

  const handleXSignIn = async () => {
    setXLoading(true)
    try {
      await signInWithX()
      // The redirect will happen automatically via Supabase OAuth
      // We don't close the dialog here as the user will be redirected
    } catch (error) {
      // Error is handled by the auth provider
    } finally {
      setXLoading(false)
    }
  }

  const handleDiscordSignIn = async () => {
    setDiscordLoading(true)
    try {
      await signInWithDiscord()
      // The redirect will happen automatically via Supabase OAuth
      // We don't close the dialog here as the user will be redirected
    } catch (error) {
      // Error is handled by the auth provider
    } finally {
      setDiscordLoading(false)
    }
  }

  const handlePasswordSetup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPassword || !confirmNewPassword) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      })
      return
    }

    if (newPassword !== confirmNewPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive",
      })
      return
    }

    if (newPassword.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters",
        variant: "destructive",
      })
      return
    }

    setSettingPassword(true)
    try {
      await setUserPassword(newPassword)
      setCurrentStep('signin')
      setNewPassword('')
      setConfirmNewPassword('')
      toast({
        title: "Success",
        description: "Password set successfully! You can now sign in with email and password.",
      })
    } catch (error) {
      // Error is handled by the auth provider
    } finally {
      setSettingPassword(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#111111] border-[#282828] max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white text-xl">
            {currentStep === 'verify' ? 'Verify Your Email' : 'Welcome to ZaLoyal'}
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            {currentStep === 'verify' 
              ? 'Enter the 6-digit code sent to your email'
              : 'Sign in to access your profile and connect social accounts'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 pt-4 pb-6">
          {currentStep === 'verify' ? (
            // Verification Step
            <div className="space-y-4">
              <div className="text-center mb-4">
                <p className="text-gray-400 text-sm">
                  We sent a verification code to <span className="text-white font-medium">{email}</span>
                </p>
              </div>

              <form onSubmit={handleVerification} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="verification-code" className="text-white">Verification Code</Label>
                  <Input
                    id="verification-code"
                    type="text"
                    placeholder="Enter 6-digit code"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="bg-[#181818] border-[#282828] text-white placeholder:text-gray-400 text-center text-lg tracking-widest"
                    maxLength={6}
                    required
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                  disabled={verifying || verificationCode.length !== 6}
                >
                  {verifying ? "Verifying..." : "Verify Email"}
                </Button>

                <div className="text-center space-y-2">
                  <p className="text-gray-400 text-sm">
                    Didn't receive the code?
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleResendVerification}
                    disabled={resending}
                    className="text-green-500 hover:text-green-400"
                  >
                    {resending ? "Sending..." : "Resend Code"}
                  </Button>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentStep('signin')}
                  className="w-full text-gray-400 hover:text-white"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Sign In
                </Button>
              </form>
            </div>
          ) : currentStep === 'setup-password' ? (
            // Password Setup Step
            <div className="space-y-4">
              <div className="text-center mb-4">
                <p className="text-gray-400 text-sm">
                  Set a password for <span className="text-white font-medium">{email}</span>
                </p>
                <p className="text-gray-500 text-xs mt-2">
                  This email was registered via social login. Set a password to enable email sign-in.
                </p>
              </div>

              <form onSubmit={handlePasswordSetup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password" className="text-white">New Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="new-password"
                      type={showNewPassword ? "text" : "password"}
                      placeholder="Create a password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="bg-[#181818] border-[#282828] text-white placeholder:text-gray-400 pl-10 pr-10"
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                    >
                      {showNewPassword ? (
                        <EyeOff className="h-4 w-4 text-gray-400" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-400" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-new-password" className="text-white">Confirm Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="confirm-new-password"
                      type={showConfirmNewPassword ? "text" : "password"}
                      placeholder="Confirm your password"
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      className="bg-[#181818] border-[#282828] text-white placeholder:text-gray-400 pl-10 pr-10"
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                    >
                      {showConfirmNewPassword ? (
                        <EyeOff className="h-4 w-4 text-gray-400" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-400" />
                      )}
                    </Button>
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                  disabled={settingPassword || newPassword.length < 6 || newPassword !== confirmNewPassword}
                >
                  {settingPassword ? "Setting Password..." : "Set Password"}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentStep('signin')}
                  className="w-full text-gray-400 hover:text-white"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Sign In
                </Button>
              </form>
            </div>
          ) : (
            // Sign In/Sign Up Tabs
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'signin' | 'signup')} className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-[#181818] border-[#282828]">
                <TabsTrigger value="signin" className="text-white">Sign In</TabsTrigger>
                <TabsTrigger value="signup" className="text-white">Sign Up</TabsTrigger>
              </TabsList>

              <TabsContent value="signin" className="space-y-4 mt-4">
                {/* Social Sign In */}
                <div className="space-y-4">
                  <Button 
                    onClick={handleXSignIn}
                    disabled={xLoading}
                    className="w-full bg-black hover:bg-gray-900 text-white border border-gray-600"
                  >
                    {xLoading ? "Connecting..." : "Continue with X"}
                  </Button>
                  
                  <Button 
                    onClick={handleDiscordSignIn}
                    disabled={discordLoading}
                    className="w-full bg-[#5865F2] hover:bg-[#4752C4] text-white border border-[#5865F2]"
                  >
                    {discordLoading ? "Connecting..." : "Continue with Discord"}
                  </Button>
                  
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-[#282828]" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-[#111111] px-2 text-gray-400">Or continue with email</span>
                    </div>
                  </div>
                </div>

                {/* Email Sign In */}
                <form onSubmit={handleEmailSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email" className="text-white">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="signin-email"
                        type="email"
                        placeholder="Enter your email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="bg-[#181818] border-[#282828] text-white placeholder:text-gray-400 pl-10"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signin-password" className="text-white">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="signin-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="bg-[#181818] border-[#282828] text-white placeholder:text-gray-400 pl-10 pr-10"
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4 text-gray-400" />
                        ) : (
                          <Eye className="h-4 w-4 text-gray-400" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                    disabled={loading}
                  >
                    {loading ? "Signing In..." : "Sign In"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup" className="space-y-4 mt-4">
                {/* Email Sign Up */}
                <form onSubmit={handleEmailSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-username" className="text-white">Username</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="signup-username"
                        type="text"
                        placeholder="Choose a username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="bg-[#181818] border-[#282828] text-white placeholder:text-gray-400 pl-10"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-email" className="text-white">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="Enter your email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="bg-[#181818] border-[#282828] text-white placeholder:text-gray-400 pl-10"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-password" className="text-white">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="signup-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Create a password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="bg-[#181818] border-[#282828] text-white placeholder:text-gray-400 pl-10 pr-10"
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4 text-gray-400" />
                        ) : (
                          <Eye className="h-4 w-4 text-gray-400" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-confirm-password" className="text-white">Confirm Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="signup-confirm-password"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Confirm your password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="bg-[#181818] border-[#282828] text-white placeholder:text-gray-400 pl-10 pr-10"
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-4 w-4 text-gray-400" />
                        ) : (
                          <Eye className="h-4 w-4 text-gray-400" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                    disabled={loading}
                  >
                    {loading ? "Creating Account..." : "Create Account"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
} 