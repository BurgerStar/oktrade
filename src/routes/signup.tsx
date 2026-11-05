import { createFileRoute, useRouter } from "@tanstack/react-router"
import { useState } from "react"
// Adjust this import path depending on where your initialized supabase client lives
import { supabase } from "@/lib/supabase" 
import { AuthPage } from "@/components/buy-auth/AuthPage"

export const Route = createFileRoute("/signup")({
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: typeof search["redirect"] === "string" ? search["redirect"] : "",
    email: typeof search["email"] === "string" ? search["email"] : "",
  }),
  head: () => ({
    meta: [
      { name: "title", content: "Sign up" },
      { name: "description", content: "Create your OK Trade account and explore crypto." }
    ],
  }),
  component: Signup,
})

function Signup() {
  const { redirect, email: initialEmail } = Route.useSearch()
  const router = useRouter()
  
  // Local state tracking for the input form items
  const [email, setEmail] = useState(initialEmail || "")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          // Redirect users back to your dashboard route once validated
          emailRedirectTo: `${window.location.origin}${redirect || "/dashboard"}`,
        },
      })

      if (authError) throw authError

      if (data.user) {
        alert("Registration initiated! Please check your email inbox for a verification link.")
        router.navigate({ to: redirect || "/dashboard" })
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred during signup.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthPage 
      type="signup"
      redirect={redirect}
      initialEmail={email}
      onEmailChange={setEmail}
      onPasswordChange={setPassword}
      onSubmit={handleSignup}
      isLoading={loading}
      errorMessage={error}
    />
  )
}