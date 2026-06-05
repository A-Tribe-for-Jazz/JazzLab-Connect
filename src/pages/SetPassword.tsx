import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Lock, AlertCircle, CheckCircle2, Eye, EyeOff, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldDescription,
} from '@/components/ui/field';
import { cn } from "@/lib/utils"

const HERO_IMAGE =
  "https://images.squarespace-cdn.com/content/v1/60beb127277b425865c6f3b4/fa62e73c-8f4c-4c26-b2ee-57fecc16ea21/_MOR0343.jpg"

export default function SetPassword() {
  const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { profile, completePasswordSetup } = useAuth();
  const [fullName, setFullName] = useState('');

  React.useEffect(() => {
    if (profile?.full_name && profile.full_name !== 'Invited User') {
      setFullName(profile.full_name);
    }
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (!fullName.trim()) {
      setError('Full Name is required');
      return;
    }

    setLoading(true);

    try {
      // 1. Update Auth password
      const { error: updateError } = await supabase.auth.updateUser({
        password: password
      });

      if (updateError) throw updateError;

      // 2. Update Profile Name
      if (profile?.id) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ full_name: fullName.trim() })
          .eq('id', profile.id);
        if (profileError) throw profileError;
      }

      setMessage('Password and profile updated successfully!');
      
      // Small delay to show success message before redirecting
      setTimeout(() => {
        // Clear the intercept flag
        completePasswordSetup();

        // Navigate to their specific dashboard based on role
        if (profile?.role === 'master_admin') navigate('/admin/dashboard');
        else if (profile?.role === 'partner') navigate('/partner/dashboard');
        else if (profile?.role === 'educator') navigate('/educator/roster');
        else navigate('/signin');
      }, 1500);
      
    } catch (err: any) {
      console.error('Error setting password and profile:', err);
      setError(err.message || 'Failed to update details');
    } finally {
      setLoading(false);
    }
  };

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
                  <div className="flex flex-col items-center gap-2 text-center">
                    <div className="mb-2">
                      <img src="/atfj-logo.png" alt="A Tribe for Jazz Logo" className="h-20 w-auto" />
                    </div>
                    <h1 className="text-2xl font-bold">Set Password</h1>
                    <p className="text-balance text-muted-foreground text-sm">
                      Secure your account by setting a new password
                    </p>
                  </div>

                  <div className="flex-1 flex flex-col justify-center space-y-4 overflow-hidden">
                    <div className="mx-auto w-full max-w-sm space-y-4">
                      {error && (
                        <div className="flex items-start gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive animate-in fade-in slide-in-from-top-1 duration-200">
                          <AlertCircle className="mt-0.5 size-4 shrink-0" />
                          <span>{error}</span>
                        </div>
                      )}

                      {message && (
                        <div className="flex flex-col items-center justify-center space-y-3 py-4 text-center animate-in fade-in zoom-in duration-300">
                          <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary shadow-sm">
                            <CheckCircle2 className="size-6" />
                          </div>
                          <div className="space-y-1">
                            <h2 className="text-base font-semibold text-foreground">Success!</h2>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                              {message}
                            </p>
                          </div>
                        </div>
                      )}

                      {!message && (
                        <>
                          <Field>
                            <FieldLabel htmlFor="full-name">Full Name</FieldLabel>
                            <div className="relative">
                              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <User className="h-4 w-4 text-muted-foreground" />
                              </div>
                              <Input
                                id="full-name"
                                type="text"
                                required
                                placeholder="Your full name"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                className="pl-9"
                              />
                            </div>
                          </Field>

                          <Field>
                            <FieldLabel htmlFor="new-password">New Password</FieldLabel>
                            <div className="relative">
                              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Lock className="h-4 w-4 text-muted-foreground" />
                              </div>
                              <Input
                                id="new-password"
                                type={showPassword ? "text" : "password"}
                                required
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="pl-9 pr-10"
                              />
                              <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-foreground transition-colors"
                                tabIndex={-1}
                              >
                                {showPassword ? (
                                  <EyeOff className="h-4 w-4" />
                                ) : (
                                  <Eye className="h-4 w-4" />
                                )}
                              </button>
                            </div>
                          </Field>

                          <Field>
                            <FieldLabel htmlFor="confirm-password">Confirm Password</FieldLabel>
                            <div className="relative">
                              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Lock className="h-4 w-4 text-muted-foreground" />
                              </div>
                              <Input
                                id="confirm-password"
                                type="password"
                                required
                                placeholder="••••••••"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="pl-9"
                              />
                            </div>
                          </Field>

                          <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? 'Saving...' : 'Set Password and Continue'}
                          </Button>
                        </>
                      )}
                    </div>
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
            By clicking Set Password, you agree to our{" "}
            <a href="#">Terms of Service</a> and{" "}
            <a href="#">Privacy Policy</a>.
          </FieldDescription>
        </div>
      </div>
    </div>
  );
}
