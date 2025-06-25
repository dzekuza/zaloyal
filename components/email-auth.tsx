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

      // Get user profile
      let { data: profile } = await supabase.from("users").select("*").eq("email", loginForm.email).single()

      // If user profile does not exist, create it
      if (!profile) {
        const { user } = data;
        const { error: profileError } = await supabase.from("users").insert({
          id: user.id,
          email: user.email,
          username: user.user_metadata?.username || "",
          auth_provider: "email",
          email_verified: false,
          total_xp: 0,
          level: 1,
          completed_quests: 0,
          role: "participant",
        });
        if (profileError) {
          onError("Profile creation error: " + (profileError.message || JSON.stringify(profileError)));
          setLoading(false);
          return;
        }
        // Fetch the newly created profile
        ({ data: profile } = await supabase.from("users").select("*").eq("email", loginForm.email).single());
      }

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

      if (error) throw error

      // Get the authenticated user (wait for session)
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) throw new Error("User not authenticated after registration");

      // Check if user already exists in users table
      const { data: existingUser, error: fetchError } = await supabase
        .from("users")
        .select("id")
        .eq("email", authUser.email)
        .single();

      if (!existingUser && !fetchError) {
        // Insert only if not exists, and set id to authUser.id
        const { error: profileError } = await supabase.from("users").insert({
          id: authUser.id,
          email: authUser.email,
          username: registerForm.username,
          auth_provider: "email",
          email_verified: false,
          total_xp: 0,
          level: 1,
          completed_quests: 0,
          role: "participant",
        });
        if (profileError) {
          console.error("Profile creation error:", profileError);
          onError("Profile creation error: " + (profileError.message || JSON.stringify(profileError)));
          setLoading(false);
          return;
        }
      }

      // Call onSuccess immediately
      onSuccess(authUser)
    } catch (error: any) {
      onError(error.message || "Registration failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="bg-gradient-to-br from-white/10 to-white/5 border-white/20 backdrop-blur-sm w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-white flex items-center justify-center gap-2">
          <Mail className="w-5 h-5" />
          Email Authentication
        </CardTitle>
        <CardDescription className="text-gray-300">Sign in or create an account with email</CardDescription>
      </CardHeader>
      <CardContent>
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
              className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white border-0"
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
      </CardContent>
    </Card>
  )
}
