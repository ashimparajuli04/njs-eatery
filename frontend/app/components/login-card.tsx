'use client'

import Image from "next/image"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { useMutation } from "@tanstack/react-query"
import api from "@/lib/api"
import { Coffee, ArrowRight, ArrowLeft, Eye, EyeOff } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function LoginCard() {
  const router = useRouter()

  // Mobile welcome screen state
  const [showMobileForm, setShowMobileForm] = useState(false)
  
  const [authMode, setAuthMode] = useState<"login" | "signup">("login")
  const [signupStep, setSignupStep] = useState<1 | 2>(1)

  const [firstNameInput, setFirstNameInput] = useState("")
  const [middleNameInput, setMiddleNameInput] = useState("")
  const [lastNameInput, setLastNameInput] = useState("")
  const [signUpEmailInput, setSignUpEmailInput] = useState("")
  const [signUpPasswordInput, setSignUpPasswordInput] = useState("")

  const [emailInput, setEmailInput] = useState("")
  const [passwordInput, setPasswordInput] = useState("")

  // Password visibility states
  const [showLoginPassword, setShowLoginPassword] = useState(false)
  const [showSignupPassword, setShowSignupPassword] = useState(false)

  const switchMode = (mode: "login" | "signup") => {
    setAuthMode(mode)
    setSignupStep(1)
  }

  // 🔥 LOGIN MUTATION
  const loginMutation = useMutation({
    mutationFn: async ({
      email,
      password,
    }: {
      email: string
      password: string
    }) => {
      const res = await api.post(
        "/auth/token",
        new URLSearchParams({
          username: email,
          password: password,
        }),
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        }
      )

      return res.data
    },

    onSuccess: (data) => {
      localStorage.setItem("access_token", data.access_token)
      toast.success("Welcome back!", {
        description: "You've been logged in successfully.",
      })
      router.push("/dashboard")
    },

    onError: () => {
      toast.error("Login failed", {
        description: "Invalid email or password. Please try again.",
      })
    },
  })

  // 🔥 SIGNUP MUTATION
  const signupMutation = useMutation({
    mutationFn: async (payload: {
      first_name: string
      middle_name: string
      last_name: string
      email: string
      password: string
    }) => {
      const res = await api.post("/users/signup", payload)
      return res.data
    },

    onSuccess: () => {
      switchMode("login")
      setEmailInput(signUpEmailInput) // Pre-fill email for convenience
      toast.success("Account created successfully!", {
        description: "Please login with your new credentials.",
      })
    },

    onError: () => {
      toast.error("Signup failed", {
        description: "Please check your details and try again.",
      })
    },
  })

  return (
    <Card className="w-full max-w-5xl flex flex-col md:flex-row px-4 md:px-8 relative overflow-hidden bg-nj-cream shadow-2xl border-2 border-stone-200/50">

      {/* LEFT IMAGE with gradient overlay - Desktop always visible */}
      <div className="hidden md:flex flex-1 relative items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-50/50 to-transparent z-10" />
        <Image
          src="/hello.svg"
          alt="NJ'S Café and Restaurant"
          fill
          className="object-contain transition-transform duration-700 hover:scale-105"
          priority
        />
        
        {/* Floating coffee icon */}
        <div className="absolute bottom-8 left-8 z-20 animate-bounce">
          <Coffee className="h-8 w-8 text-amber-700/30" />
        </div>
      </div>

      {/* MOBILE: Welcome Screen with SVG - shown when form is hidden */}
      {!showMobileForm && (
        <div className="md:hidden w-full min-h-[500px] relative flex flex-col items-center justify-center p-8 animate-in fade-in duration-500">
          {/* Restaurant SVG/Logo */}
          <div className="relative w-full h-96 mb-8">
            <Image
              src="/hello.svg"
              alt="NJ'S Café and Restaurant"
              fill
              className="object-contain"
              priority
            />
          </div>

          {/* Get Started Button */}
          <Button
            onClick={() => setShowMobileForm(true)}
            className="w-full max-w-sm bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600 text-white shadow-md hover:shadow-lg transition-all duration-200 group"
          >
            <span className="flex items-center gap-2">
              Get Started
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </span>
          </Button>
        </div>
      )}

      {/* RIGHT CARD with animation - Always visible on desktop, conditional on mobile */}
      <Card className={`
        ${showMobileForm ? 'flex' : 'hidden md:flex'}
        flex-1 min-h-[28rem] shadow-none md:border-l-2 border-stone-200/50 animate-in slide-in-from-right duration-500
      `}>

        <CardHeader className="space-y-3 px-6 pt-6">
          <div className="flex items-center gap-2">
            <div className="h-1 w-12 bg-gradient-to-r from-amber-600 to-amber-400 rounded-full" />
          </div>
          
          <CardTitle className="text-2xl font-bold text-stone-900">
            {authMode === "login"
              ? "Welcome back"
              : signupStep === 1
              ? "Join us"
              : "Almost there"}
          </CardTitle>

          <CardDescription className="text-base text-stone-600">
            {authMode === "login"
              ? "Enter your credentials to continue"
              : signupStep === 1
              ? "Tell us about yourself"
              : "Set up your login credentials"}
          </CardDescription>

          <CardAction className="pt-2">
            <div className="flex flex-col items-center text-center gap-1">
              <span className="text-sm text-stone-600">
                {authMode === "login" ? "Don't have an account?" : "Already have an account?"}
              </span>
              <Button
                variant="link"
                className="text-amber-700 hover:text-amber-800 font-semibold p-0 h-auto"
                onClick={() =>
                  switchMode(authMode === "login" ? "signup" : "login")
                }
              >
                {authMode === "login" ? "Sign Up" : "Login"}
              </Button>
            </div>
          </CardAction>
        </CardHeader>

        <CardContent>
          <div className="flex flex-col gap-5">

            {/* LOGIN */}
            {authMode === "login" && (
              <div className="space-y-4 animate-in fade-in duration-500">
                <div className="grid gap-2">
                  <Label className="text-stone-700 font-medium">Email</Label>
                  <Input
                    type="email"
                    placeholder="your@email.com"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    className="border-stone-300 focus:border-amber-500 transition-colors"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && emailInput && passwordInput) {
                        loginMutation.mutate({ email: emailInput, password: passwordInput })
                      }
                    }}
                  />
                </div>

                <div className="grid gap-2">
                  <Label className="text-stone-700 font-medium">Password</Label>
                  <div className="relative">
                    <Input
                      type={showLoginPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      className="border-stone-300 focus:border-amber-500 transition-colors pr-10"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && emailInput && passwordInput) {
                          loginMutation.mutate({ email: emailInput, password: passwordInput })
                        }
                      }}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                    >
                      {showLoginPassword ? (
                        <EyeOff className="h-4 w-4 text-stone-400" />
                      ) : (
                        <Eye className="h-4 w-4 text-stone-400" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* SIGNUP STEP 1 */}
            {authMode === "signup" && signupStep === 1 && (
              <div className="space-y-4 animate-in fade-in duration-500">
                <div className="grid gap-2">
                  <Label className="text-stone-700 font-medium">
                    First Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    placeholder="John"
                    value={firstNameInput}
                    onChange={(e) => setFirstNameInput(e.target.value)}
                    className="border-stone-300 focus:border-amber-500 transition-colors"
                  />
                </div>

                <div className="grid gap-2">
                  <Label className="text-stone-700 font-medium">
                    Middle Name <span className="text-stone-400 text-xs">(optional)</span>
                  </Label>
                  <Input
                    placeholder="Michael"
                    value={middleNameInput}
                    onChange={(e) => setMiddleNameInput(e.target.value)}
                    className="border-stone-300 focus:border-amber-500 transition-colors"
                  />
                </div>

                <div className="grid gap-2">
                  <Label className="text-stone-700 font-medium">
                    Last Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    placeholder="Doe"
                    value={lastNameInput}
                    onChange={(e) => setLastNameInput(e.target.value)}
                    className="border-stone-300 focus:border-amber-500 transition-colors"
                  />
                </div>
              </div>
            )}

            {/* SIGNUP STEP 2 */}
            {authMode === "signup" && signupStep === 2 && (
              <div className="space-y-4 animate-in fade-in duration-500">
                <div className="grid gap-2">
                  <Label className="text-stone-700 font-medium">
                    Email <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="email"
                    placeholder="your@email.com"
                    value={signUpEmailInput}
                    onChange={(e) => setSignUpEmailInput(e.target.value)}
                    className="border-stone-300 focus:border-amber-500 transition-colors"
                  />
                </div>

                <div className="grid gap-2">
                  <Label className="text-stone-700 font-medium">
                    Password <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      type={showSignupPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={signUpPasswordInput}
                      onChange={(e) => setSignUpPasswordInput(e.target.value)}
                      className="border-stone-300 focus:border-amber-500 transition-colors pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowSignupPassword(!showSignupPassword)}
                    >
                      {showSignupPassword ? (
                        <EyeOff className="h-4 w-4 text-stone-400" />
                      ) : (
                        <Eye className="h-4 w-4 text-stone-400" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-stone-500 mt-1">
                    Must be at least 8 characters
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>

        <CardFooter className="flex-col gap-3 pt-2">

          {/* LOGIN BUTTON */}
          {authMode === "login" && (
            <Button
              disabled={loginMutation.isPending || !emailInput || !passwordInput}
              onClick={() =>
                loginMutation.mutate({
                  email: emailInput,
                  password: passwordInput,
                })
              }
              className="w-full bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600 text-white shadow-md hover:shadow-lg transition-all duration-200 group"
            >
              {loginMutation.isPending ? (
                <span className="flex items-center gap-2">
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Logging in...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Login
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </span>
              )}
            </Button>
          )}

          {/* SIGNUP STEP 1 */}
          {authMode === "signup" && signupStep === 1 && (
            <Button
              onClick={() => {
                if (!firstNameInput || !lastNameInput) {
                  toast.error("Missing information", {
                    description: "First and Last name are required.",
                  })
                  return
                }
                setSignupStep(2)
              }}
              disabled={!firstNameInput || !lastNameInput}
              className="w-full bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600 text-white shadow-md hover:shadow-lg transition-all duration-200 group"
            >
              <span className="flex items-center gap-2">
                Continue
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </span>
            </Button>
          )}

          {/* SIGNUP STEP 2 */}
          {authMode === "signup" && signupStep === 2 && (
            <div className="w-full space-y-2">
              <Button
                disabled={signupMutation.isPending || !signUpEmailInput || !signUpPasswordInput}
                onClick={() =>
                  signupMutation.mutate({
                    first_name: firstNameInput,
                    middle_name: middleNameInput,
                    last_name: lastNameInput,
                    email: signUpEmailInput,
                    password: signUpPasswordInput,
                  })
                }
                className="w-full bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600 text-white shadow-md hover:shadow-lg transition-all duration-200"
              >
                {signupMutation.isPending ? (
                  <span className="flex items-center gap-2">
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Creating account...
                  </span>
                ) : (
                  "Create Account"
                )}
              </Button>
              
              <Button
                variant="ghost"
                onClick={() => setSignupStep(1)}
                className="w-full text-stone-600 hover:text-stone-900 group"
              >
                <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                Back
              </Button>
            </div>
          )}

          {/* Step indicator for signup */}
          {authMode === "signup" && (
            <div className="flex items-center gap-2 mt-2">
              <div className={`h-1.5 w-8 rounded-full transition-all duration-300 ${
                signupStep === 1 ? 'bg-amber-600' : 'bg-stone-300'
              }`} />
              <div className={`h-1.5 w-8 rounded-full transition-all duration-300 ${
                signupStep === 2 ? 'bg-amber-600' : 'bg-stone-300'
              }`} />
            </div>
          )}

        </CardFooter>
      </Card>

    </Card>
  )
}