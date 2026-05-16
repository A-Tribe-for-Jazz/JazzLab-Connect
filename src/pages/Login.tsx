import { Navigate } from "react-router-dom"
import { LoginForm } from "@/components/login-form"
import { useAuth } from "../contexts/AuthContext"

export default function LoginPage() {
  const { user, profile } = useAuth()

  // If already logged in, redirect based on role
  if (user && profile) {
    if (profile.role === "master_admin")
      return <Navigate to="/admin/dashboard" replace />
    if (profile.role === "partner")
      return <Navigate to="/partner/dashboard" replace />
    if (profile.role === "educator")
      return <Navigate to="/educator/roster" replace />
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-muted p-6 md:p-10">
      <div className="w-full max-w-sm md:max-w-5xl">
        <LoginForm />
      </div>
    </div>
  )
}
