"use client";

import Link from 'next/link';
import { useState } from 'react';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

import { MarketingShell } from '@/components/marketing-shell';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

export default function ForgotPasswordPage() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSent(false);
    setIsLoading(true);

    try {
      await resetPassword(email);
      setSent(true);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Unable to send reset email.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <MarketingShell compact>
      <div className="mx-auto flex min-h-[70vh] max-w-xl items-center justify-center">
        <Card className="w-full border-white/80 bg-white/80 shadow-[0_28px_90px_-50px_rgba(15,23,42,0.5)] backdrop-blur-xl">
          <CardHeader className="space-y-3">
            <CardTitle className="text-3xl font-semibold text-slate-950">Reset your password</CardTitle>
            <CardDescription className="text-base text-slate-500">
              Enter the email tied to your account and Firebase will send a reset link.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Email</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@school.edu"
                  className="border-slate-200 bg-white/70"
                  disabled={isLoading}
                  required
                />
              </div>

              {error && (
                <div className="flex gap-3 rounded-2xl border border-destructive/20 bg-destructive/10 p-3">
                  <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-destructive" />
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}

              {sent && (
                <div className="flex gap-3 rounded-2xl border border-primary/20 bg-primary/10 p-3">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                  <p className="text-sm text-slate-700">
                    Reset email sent. Check your inbox and spam folder.
                  </p>
                </div>
              )}

              <Button
                type="submit"
                disabled={isLoading || !email}
                className="h-11 w-full rounded-full bg-slate-950 text-white hover:bg-slate-800"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  'Send reset link'
                )}
              </Button>
            </form>

            <p className="mt-6 text-sm text-slate-500">
              Remembered it?{' '}
              <Link href="/login" className="font-medium text-slate-950">
                Back to login
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </MarketingShell>
  );
}
