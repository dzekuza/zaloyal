"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Mail, Eye, EyeOff, User } from "lucide-react"
import { supabase } from "@/lib/supabase"

interface EmailAuthProps {
  onSuccess: (user: any) => void
  onError: (error: string) => void
}

export default function EmailAuth({ onSuccess, onError }: EmailAuthProps) {
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [verificationEmail, setVerificationEmail] = useState("")
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

      if (error) throw error

      // Always upsert user profile after login
      const { user } = data;
      let { data: profile } = await supabase.from("users").select("*").eq("email", loginForm.email).single()
      await supabase.from("users").upsert({
        id: user.id,
        email: user.email,
        // Only set username if it exists in user_metadata or profile
        ...(user.user_metadata?.username
          ? { username: user.user_metadata.username }
          : profile?.username
          ? { username: profile.username }
          : {}),
        email_verified: false,
        total_xp: profile?.total_xp || 0,
        level: profile?.level || 1,
        completed_quests: profile?.completed_quests || 0,
        role: profile?.role || "participant",
      });
      // Fetch the up-to-date profile
      ({ data: profile } = await supabase.from("users").select("*").eq("email", loginForm.email).single());

      onSuccess({ ...data.user, profile })
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
      // Register with Supabase Auth - simpler approach
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

      console.log('Signup response:', data);

      // Check if user was created successfully
      if (data.user) {
        console.log('User created successfully:', data.user.id);
        
        // Manually create user profile (don't rely on trigger)
        try {
          const { error: profileError } = await supabase.from("users").upsert({
            id: data.user.id,
            email: data.user.email,
            username: registerForm.username,
            total_xp: 0,
            level: 1,
            completed_quests: 0,
            role: "participant",
          });

          if (profileError) {
            console.error('Profile creation error:', profileError);
            // Don't throw here, the user was created successfully
          } else {
            console.log('User profile created successfully');
          }
        } catch (profileError) {
          console.error('Profile creation failed:', profileError);
          // Don't throw here, the user was created successfully
        }

        // Call onSuccess with the user
        onSuccess(data.user);
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

  return (
    <>
      <div className="text-center mb-6">
        <div className="text-white flex items-center justify-center gap-2 text-2xl font-semibold">
          <Mail className="w-5 h-5" />
          Email Authentication
        </div>
        <div className="text-gray-300 mt-1">Sign in or create an account with email</div>
      </div>
      <Tabs defaultValue="login" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 bg-white/10">
          <TabsTrigger value="login" className="data-[state=active]:bg-white/20 text-white">
            Sign In
          </TabsTrigger>
          <TabsTrigger value="register" className="data-[state=active]:bg-white/20 text-white">
            Sign Up
          </TabsTrigger>
        </TabsList>
        <TabsContent value="login" className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="login-email" className="text-white flex items-center gap-2">
              <Mail className="w-4 h-4" />
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
            <Label htmlFor="login-password" className="text-white flex items-center gap-2">
              <Eye className="w-4 h-4" />
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
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
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
        <TabsContent value="register" className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="register-username" className="text-white flex items-center gap-2">
              <User className="w-4 h-4" />
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
            <Label htmlFor="register-email" className="text-white flex items-center gap-2">
              <Mail className="w-4 h-4" />
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
            <Label htmlFor="register-password" className="text-white flex items-center gap-2">
              <Eye className="w-4 h-4" />
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
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password" className="text-white flex items-center gap-2">
              <Eye className="w-4 h-4" />
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
    </>
  )
}
