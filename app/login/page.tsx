"use client";

import Link from 'next/link';
import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Loader2 } from "lucide-react";

import { useAuth } from "@/lib/auth-context";
import { getDefaultRouteForRole } from "@/lib/firebase/auth";
import { MarketingShell } from '@/components/marketing-shell';
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  const router = useRouter();
  const { login, error: authError } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const profile = await login(email, password);
      router.push(getDefaultRouteForRole(profile.role));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Invalid email or password.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <MarketingShell compact>
      <div className="mx-auto flex min-h-[70vh] max-w-xl items-center justify-center">
        <Card className="w-full border-white/80 bg-white/80 shadow-[0_28px_90px_-50px_rgba(15,23,42,0.5)] backdrop-blur-xl">
          <CardHeader className="space-y-3 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-950 text-sm font-semibold text-white">
              EP
            </div>
            <CardTitle className="text-3xl font-semibold text-slate-950">Log in</CardTitle>
            <CardDescription className="text-base text-slate-500">
              Enter your account to continue with requests, approvals, or gate verification.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Email</label>
                <Input
                  type="email"
                  placeholder="you@school.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  className="border-slate-200 bg-white/70"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Password</label>
                <Input
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  className="border-slate-200 bg-white/70"
                />
              </div>

              {error && (
                <div className="flex gap-3 rounded-2xl border border-destructive/20 bg-destructive/10 p-3">
                  <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-destructive" />
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}

              {!error && authError && (
                <div className="flex gap-3 rounded-2xl border border-amber-300/50 bg-amber-100/70 p-3">
                  <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-700" />
                  <p className="text-sm text-amber-800">{authError}</p>
                </div>
              )}

              <Button
                type="submit"
                disabled={isLoading || !email || !password}
                className="h-11 w-full rounded-full bg-slate-950 text-white hover:bg-slate-800"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>

            <div className="mt-6 flex flex-col gap-3 border-t border-slate-200 pt-6 text-sm text-slate-500">
              <Link href="/forgot-password" className="hover:text-slate-950">
                Forgot your password?
              </Link>
              <Link href="/staff-join" className="hover:text-slate-950">
                Staff invite or lead setup
              </Link>
              <div className="flex flex-wrap gap-3 text-xs">
                <Link href="/admin" className="hover:text-slate-950">
                  /admin
                </Link>
                <Link href="/security" className="hover:text-slate-950">
                  /security
                </Link>
                <Link href="/chaplaincy" className="hover:text-slate-950">
                  /chaplaincy
                </Link>
              </div>
              <p>
                New student?{" "}
                <Link href="/signup" className="font-medium text-slate-950">
                  Create an account
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </MarketingShell>
  );
}
