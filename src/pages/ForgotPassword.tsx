import { useState } from "react"
import { Link } from "react-router-dom"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldDescription,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { AlertCircle, CheckCircle2, ArrowLeft } from "lucide-react"
import { supabase } from "../lib/supabase"

const HERO_IMAGE =
  "https://images.squarespace-cdn.com/content/v1/60beb127277b425865c6f3b4/fa62e73c-8f4c-4c26-b2ee-57fecc16ea21/_MOR0343.jpg"

export default function ForgotPassword() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)
    try {
      const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const redirectTo = `${isLocal ? window.location.origin : 'https://jazzlabconnect.com'}/set-password`;
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      })
      if (error) throw error
      setMessage("Password reset link sent! Please check your email.")
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-muted p-6 md:p-10">
      <div className="w-full max-w-sm md:max-w-5xl">
        <div className={cn("flex flex-col gap-6")}>
          <Card className="overflow-hidden p-0">
            <CardContent className="grid p-0 md:grid-cols-2">
              <form
                className="p-6 md:p-8"
                onSubmit={handleSubmit}
              >
                <FieldGroup className="h-[480px]">
                  {!message && (
                    <div className="flex flex-col items-center gap-2 text-center">
                      <div className="mb-2">
                        <img src="/atfj-logo.png" alt="A Tribe for Jazz Logo" className="h-20 w-auto" />
                      </div>
                      <h1 className="text-2xl font-bold">Forgot Password</h1>
                      <p className="text-balance text-muted-foreground text-sm">
                        Enter your email address to receive a reset link
                      </p>
                    </div>
                  )}

                  <div className="flex-1 flex flex-col justify-center overflow-hidden">
                    <div className="mx-auto w-full max-w-sm space-y-4">
                      {error && (
                        <div className="mb-4 flex items-start gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive animate-in fade-in slide-in-from-top-1 duration-200">
                          <AlertCircle className="mt-0.5 size-4 shrink-0" />
                          <span>{error}</span>
                        </div>
                      )}

                      {message ? (
                        <div className="flex flex-col items-center justify-center space-y-3 py-4 text-center animate-in fade-in zoom-in duration-300">
                          <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary shadow-sm">
                            <CheckCircle2 className="size-6" />
                          </div>
                          <div className="space-y-1">
                            <h2 className="text-base font-semibold text-foreground">Check your email</h2>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                              {message}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <Field>
                            <FieldLabel htmlFor="email">Email Address</FieldLabel>
                            <Input
                              id="email"
                              type="email"
                              placeholder="m@example.com"
                              required
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                            />
                          </Field>

                          <Button type="submit" disabled={loading} className="w-full">
                            {loading ? "Sending..." : "Send Reset Link"}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="text-center pt-2">
                    <Link
                      to="/signin"
                      className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors font-medium"
                    >
                      <ArrowLeft className="size-4" />
                      Back to sign in
                    </Link>
                  </div>

                  <FieldDescription className="text-center text-[10px]">
                    Authorized personnel only. Contact the Program Director for
                    access.
                  </FieldDescription>
                </FieldGroup>
              </form>
              <div className="relative hidden bg-muted md:block">
                <img
                  src={HERO_IMAGE}
                  alt="A Tribe for Jazz Summer Arts Program"
                  className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
                />
              </div>
            </CardContent>
          </Card>
          <FieldDescription className="px-6 text-center">
            By clicking Send Reset Link, you agree to our{" "}
            <a href="#">Terms of Service</a> and{" "}
            <a href="#">Privacy Policy</a>.
          </FieldDescription>
        </div>
      </div>
    </div>
  )
}
