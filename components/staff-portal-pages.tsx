"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, ArrowRight, CheckCircle2, Loader2, ShieldCheck } from "lucide-react";

import { MarketingShell } from "@/components/marketing-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { apiService } from "@/lib/api-service";
import { useAuth } from "@/lib/auth-context";
import { getDefaultRouteForRole } from "@/lib/firebase/auth";
import { getPortalForRole, staffPortals, type StaffPortalSlug } from "@/lib/staff-portals";
import type { StaffInvite } from "@/lib/types";

export function StaffPortalLanding({ portal }: { portal: StaffPortalSlug }) {
  const config = staffPortals[portal];

  return (
    <MarketingShell compact>
      <div className="mx-auto flex min-h-[76vh] max-w-4xl items-center justify-center">
        <div className="grid w-full gap-6 md:grid-cols-[1.15fr_0.85fr]">
          <Card className="border-white/80 bg-white/80 shadow-[0_28px_90px_-50px_rgba(15,23,42,0.5)] backdrop-blur-xl">
            <CardHeader className="space-y-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-950 text-white">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <CardTitle className="text-3xl font-semibold text-slate-950">{config.title}</CardTitle>
              <CardDescription className="text-base text-slate-500">{config.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                <p className="font-medium text-slate-900">Lead email</p>
                <p className="mt-2">{config.leadEmail}</p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link href={`/${portal}/login`} className="flex-1">
                  <Button className="h-11 w-full rounded-full bg-slate-950 text-white hover:bg-slate-800">
                    Log In
                  </Button>
                </Link>
                <Link href={`/${portal}/signup`} className="flex-1">
                  <Button variant="outline" className="h-11 w-full rounded-full">
                    Sign Up
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/70 bg-white/70 backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="text-xl text-slate-950">Quick links</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-600">
              <PortalLink href={`/${portal}/login`} label={`${config.label} login`} />
              <PortalLink href={`/${portal}/signup`} label={`${config.label} signup`} />
              <PortalLink href="/login" label="Student login" />
              <PortalLink href="/signup" label="Student signup" />
            </CardContent>
          </Card>
        </div>
      </div>
    </MarketingShell>
  );
}

export function StaffPortalLogin({ portal }: { portal: StaffPortalSlug }) {
  const config = staffPortals[portal];
  const router = useRouter();
  const { login, error: authError } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const profile = await login(email, password);

      if (!config.acceptedRoles.includes(profile.role)) {
        throw new Error(`This account belongs on /${getPortalForRole(profile.role)} instead.`);
      }

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
              {config.label.slice(0, 2).toUpperCase()}
            </div>
            <CardTitle className="text-3xl font-semibold text-slate-950">{config.label} Log In</CardTitle>
            <CardDescription className="text-base text-slate-500">{config.loginDescription}</CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Field label="Email">
                <Input
                  type="email"
                  placeholder={config.leadEmail}
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  disabled={isLoading}
                  className="border-slate-200 bg-white/70"
                />
              </Field>

              <Field label="Password">
                <Input
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  disabled={isLoading}
                  className="border-slate-200 bg-white/70"
                />
              </Field>

              {error && <ErrorNotice message={error} />}

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
              <Link href={`/${portal}/signup`} className="hover:text-slate-950">
                New here? Create {config.label.toLowerCase()} access
              </Link>
              <Link href="/forgot-password" className="hover:text-slate-950">
                Forgot your password?
              </Link>
              <Link href="/login" className="hover:text-slate-950">
                Student login
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </MarketingShell>
  );
}

export function StaffPortalSignup({ portal }: { portal: StaffPortalSlug }) {
  return (
    <Suspense fallback={<StaffSignupFallback />}>
      <StaffPortalSignupContent portal={portal} />
    </Suspense>
  );
}

function StaffPortalSignupContent({ portal }: { portal: StaffPortalSlug }) {
  const config = staffPortals[portal];
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const { login } = useAuth();
  const [invite, setInvite] = useState<StaffInvite | null>(null);
  const [inviteLoading, setInviteLoading] = useState(Boolean(token));
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      return;
    }

    setInviteLoading(true);
    void apiService
      .getStaffInviteDetails(token)
      .then((result) => {
        setInvite(result);
        setFormData((current) => ({
          ...current,
          email: result?.email || current.email,
        }));

        if (!result) {
          setError("This invite is invalid, expired, or already used.");
          return;
        }

        if (!config.acceptedRoles.includes(result.role)) {
          setError(`This invite belongs on /${getPortalForRole(result.role)}/signup instead.`);
        }
      })
      .catch(() => setError("Unable to load that invite right now."))
      .finally(() => setInviteLoading(false));
  }, [config.acceptedRoles, token]);

  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    if (invite && !config.acceptedRoles.includes(invite.role)) {
      setError(`This invite belongs on /${getPortalForRole(invite.role)}/signup instead.`);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setIsSubmitting(true);

    try {
      const createdUser = await apiService.registerStaffAccount({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        token: token || undefined,
      });

      const profile = await login(formData.email, formData.password);

      if (!config.acceptedRoles.includes(profile.role || createdUser.role)) {
        throw new Error(`This account belongs on /${getPortalForRole(profile.role || createdUser.role)} instead.`);
      }

      router.push(getDefaultRouteForRole(profile.role || createdUser.role));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to create the staff account.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const subtitle = invite
    ? `${invite.role.replace("_", " ")} access${invite.hostel ? ` for ${invite.hostel}` : ""}`
    : config.signupDescription;

  return (
    <MarketingShell compact>
      <div className="mx-auto flex min-h-[78vh] max-w-2xl items-center justify-center">
        <Card className="w-full border-white/80 bg-white/80 shadow-[0_28px_90px_-50px_rgba(15,23,42,0.5)] backdrop-blur-xl">
          <CardHeader className="space-y-3">
            <CardTitle className="text-3xl font-semibold text-slate-950">{config.label} Sign Up</CardTitle>
            <CardDescription className="text-base text-slate-500">{subtitle}</CardDescription>
          </CardHeader>

          <CardContent className="space-y-5">
            {invite && (
              <div className="rounded-3xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                <div className="flex items-center gap-2 font-medium">
                  <CheckCircle2 className="h-4 w-4" />
                  Invite ready
                </div>
                <p className="mt-2">
                  Email: <span className="font-medium">{invite.email}</span>
                </p>
                <p>
                  Role: <span className="font-medium capitalize">{invite.role.replace("_", " ")}</span>
                </p>
                {invite.hostel && (
                  <p>
                    Hostel: <span className="font-medium">{invite.hostel}</span>
                  </p>
                )}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <Field label="Full name">
                <Input
                  value={formData.name}
                  onChange={(event) => handleChange("name", event.target.value)}
                  placeholder="Enter your full name"
                  className="border-slate-200 bg-white/70"
                  disabled={isSubmitting || inviteLoading}
                  required
                />
              </Field>

              <Field label="Email">
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(event) => handleChange("email", event.target.value)}
                  placeholder={config.leadEmail}
                  className="border-slate-200 bg-white/70"
                  disabled={isSubmitting || inviteLoading || Boolean(invite)}
                  required
                />
              </Field>

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Password">
                  <Input
                    type="password"
                    value={formData.password}
                    onChange={(event) => handleChange("password", event.target.value)}
                    placeholder="Minimum 8 characters"
                    className="border-slate-200 bg-white/70"
                    disabled={isSubmitting || inviteLoading}
                    required
                  />
                </Field>

                <Field label="Confirm password">
                  <Input
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(event) => handleChange("confirmPassword", event.target.value)}
                    placeholder="Repeat your password"
                    className="border-slate-200 bg-white/70"
                    disabled={isSubmitting || inviteLoading}
                    required
                  />
                </Field>
              </div>

              {error && <ErrorNotice message={error} />}

              <Button
                type="submit"
                disabled={isSubmitting || inviteLoading || !formData.email || !formData.name}
                className="h-11 w-full rounded-full bg-slate-950 text-white hover:bg-slate-800"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Setting up account...
                  </>
                ) : (
                  "Create Staff Account"
                )}
              </Button>
            </form>

            <div className="border-t border-slate-200 pt-5 text-sm text-slate-500">
              <p>
                Already active?{" "}
                <Link href={`/${portal}/login`} className="font-medium text-slate-950">
                  Log in
                </Link>
              </p>
              <p className="mt-2">
                Lead email: <span className="font-medium">{config.leadEmail}</span>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </MarketingShell>
  );
}

function StaffSignupFallback() {
  return (
    <MarketingShell compact>
      <div className="mx-auto flex min-h-[78vh] max-w-2xl items-center justify-center">
        <Card className="w-full border-white/80 bg-white/80 shadow-[0_28px_90px_-50px_rgba(15,23,42,0.5)] backdrop-blur-xl">
          <CardContent className="py-16 text-center text-slate-500">Loading staff access...</CardContent>
        </Card>
      </div>
    </MarketingShell>
  );
}

function PortalLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 hover:bg-slate-50">
      <span>{label}</span>
      <ArrowRight className="h-4 w-4" />
    </Link>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      {children}
    </div>
  );
}

function ErrorNotice({ message }: { message: string }) {
  return (
    <div className="flex gap-3 rounded-2xl border border-destructive/20 bg-destructive/10 p-3">
      <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-destructive" />
      <p className="text-sm text-destructive">{message}</p>
    </div>
  );
}
