"use client";

import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  KeyRound,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import {
  confirmPasswordReset,
  verifyPasswordResetCode,
} from "firebase/auth";

import { Link } from "@/components/app-link";
import { MarketingShell } from "@/components/marketing-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getFirebaseAuth } from "@/lib/firebase/client";

type ResetState = "verifying" | "ready" | "success" | "invalid";

function getResetErrorMessage(error: unknown, fallback: string) {
  const code =
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as { code?: unknown }).code === "string"
      ? (error as { code: string }).code
      : "";

  switch (code) {
    case "auth/expired-action-code":
      return "This reset link has expired. Request a new password reset email.";
    case "auth/invalid-action-code":
      return "This reset link is invalid or has already been used.";
    case "auth/user-disabled":
      return "This account has been disabled. Contact support for help.";
    case "auth/weak-password":
      return "Choose a stronger password with at least 6 characters.";
    case "auth/network-request-failed":
      return "Network error. Check your connection and try again.";
    default:
      return fallback;
  }
}

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [state, setState] = useState<ResetState>("verifying");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const oobCode = searchParams.get("oobCode") || "";
  const mode = searchParams.get("mode") || "";

  useEffect(() => {
    let isCancelled = false;

    if (!oobCode || (mode && mode !== "resetPassword")) {
      setState("invalid");
      setError("This password reset link is incomplete. Request a new reset email.");
      return;
    }

    void (async () => {
      setState("verifying");
      setError("");

      try {
        const verifiedEmail = await verifyPasswordResetCode(getFirebaseAuth(), oobCode);

        if (!isCancelled) {
          setEmail(verifiedEmail);
          setState("ready");
        }
      } catch (nextError) {
        if (!isCancelled) {
          setError(getResetErrorMessage(nextError, "Unable to verify this reset link."));
          setState("invalid");
        }
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, [mode, oobCode]);

  const passwordHint = useMemo(() => {
    if (!password) {
      return "Use a strong password you have not used elsewhere.";
    }

    if (password.length < 6) {
      return "Password must be at least 6 characters.";
    }

    if (confirmPassword && password !== confirmPassword) {
      return "Passwords do not match yet.";
    }

    return "Password looks good.";
  }, [confirmPassword, password]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    if (!oobCode) {
      setError("This password reset link is missing its verification code.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);

    try {
      await confirmPasswordReset(getFirebaseAuth(), oobCode, password);
      setState("success");
    } catch (nextError) {
      setError(getResetErrorMessage(nextError, "Unable to reset your password."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <MarketingShell compact>
      <div className="mx-auto flex min-h-[72vh] max-w-5xl items-center justify-center">
        <Card className="w-full overflow-hidden border-white/80 bg-white/85 shadow-[0_32px_120px_-58px_rgba(15,23,42,0.55)] backdrop-blur-xl">
          <CardContent className="grid gap-0 p-0 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="border-b border-blue-100/80 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.18),transparent_55%),linear-gradient(180deg,#eef6ff,#f8fbff)] p-8 lg:border-b-0 lg:border-r">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-[0_18px_40px_-24px_rgba(15,23,42,0.6)]">
                {state === "success" ? (
                  <CheckCircle2 className="h-6 w-6" />
                ) : state === "invalid" ? (
                  <AlertCircle className="h-6 w-6" />
                ) : (
                  <KeyRound className="h-6 w-6" />
                )}
              </div>

              <h1 className="mt-6 text-3xl font-semibold tracking-tight text-slate-950">
                {state === "success"
                  ? "Password updated"
                  : state === "invalid"
                    ? "Reset link issue"
                    : "Create a new password"}
              </h1>
              <p className="mt-4 max-w-md text-sm leading-7 text-slate-600">
                {state === "success"
                  ? "Your account is ready again. Sign in with the new password you just created."
                  : state === "invalid"
                    ? "This link cannot finish the password reset. You can request a fresh email and try again."
                    : "This dedicated screen verifies your reset link first, then lets you safely choose a new password inside ExitPass."}
              </p>

              <div className="mt-8 space-y-4">
                <div className="rounded-[1.4rem] border border-blue-100 bg-white/80 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                    Account
                  </p>
                  <p className="mt-2 text-sm font-medium text-slate-900">
                    {email || "Verifying reset email..."}
                  </p>
                </div>

                <div className="rounded-[1.4rem] border border-blue-100 bg-white/80 p-4">
                  <div className="flex items-start gap-3">
                    <ShieldCheck className="mt-0.5 h-4 w-4 text-blue-600" />
                    <p className="text-sm leading-6 text-slate-600">
                      Use at least 6 characters and avoid reusing an old password.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-8 lg:p-10">
              {state === "verifying" ? (
                <div className="flex min-h-[20rem] flex-col items-center justify-center text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-slate-950" />
                  <p className="mt-4 text-sm text-slate-600">Verifying your reset link...</p>
                </div>
              ) : state === "success" ? (
                <div className="flex min-h-[20rem] flex-col justify-center">
                  <div className="rounded-[1.5rem] border border-emerald-200 bg-emerald-50 p-5">
                    <div className="flex gap-3">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-600" />
                      <p className="text-sm leading-6 text-emerald-800">
                        Your password has been reset successfully. You can now return to login.
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                    <Button
                      onClick={() => navigate("/login")}
                      className="h-11 rounded-full bg-slate-950 px-6 text-white hover:bg-slate-800"
                    >
                      Go to login
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                    <Button
                      asChild
                      variant="outline"
                      className="h-11 rounded-full border-slate-200 bg-white text-slate-900 hover:bg-slate-50"
                    >
                      <Link href="/forgot-password">Request another reset email</Link>
                    </Button>
                  </div>
                </div>
              ) : state === "invalid" ? (
                <div className="flex min-h-[20rem] flex-col justify-center">
                  <div className="rounded-[1.5rem] border border-rose-200 bg-rose-50 p-5">
                    <div className="flex gap-3">
                      <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-rose-600" />
                      <p className="text-sm leading-6 text-rose-800">
                        {error || "This reset link cannot be used."}
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                    <Button
                      asChild
                      className="h-11 rounded-full bg-slate-950 px-6 text-white hover:bg-slate-800"
                    >
                      <Link href="/forgot-password">Request a new reset email</Link>
                    </Button>
                    <Button
                      asChild
                      variant="outline"
                      className="h-11 rounded-full border-slate-200 bg-white text-slate-900 hover:bg-slate-50"
                    >
                      <Link href="/login">Back to login</Link>
                    </Button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                      New password
                    </p>
                    <h2 className="mt-3 text-2xl font-semibold text-slate-950">
                      Set the password you want to use next
                    </h2>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">New password</label>
                    <Input
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="Enter a new password"
                      className="h-12 rounded-2xl border-slate-200 bg-white/80"
                      disabled={isSubmitting}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Confirm password</label>
                    <Input
                      type="password"
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      placeholder="Re-enter the new password"
                      className="h-12 rounded-2xl border-slate-200 bg-white/80"
                      disabled={isSubmitting}
                      required
                    />
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3">
                    <p className="text-sm text-slate-600">{passwordHint}</p>
                  </div>

                  {error ? (
                    <div className="flex gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-3">
                      <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-rose-600" />
                      <p className="text-sm text-rose-700">{error}</p>
                    </div>
                  ) : null}

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="h-11 flex-1 rounded-full bg-slate-950 text-white hover:bg-slate-800"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Updating password...
                        </>
                      ) : (
                        "Save new password"
                      )}
                    </Button>
                    <Button
                      asChild
                      variant="outline"
                      className="h-11 rounded-full border-slate-200 bg-white text-slate-900 hover:bg-slate-50"
                    >
                      <Link href="/login">Cancel</Link>
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </MarketingShell>
  );
}
