"use client";

import { Suspense, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

import { Link } from "@/components/app-link";
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
  return <StaffPortalLogin portal={portal} />;
}

export function StaffPortalLogin({ portal }: { portal: StaffPortalSlug }) {
  const config = staffPortals[portal];
  const navigate = useNavigate();
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

      navigate(getDefaultRouteForRole(profile.role));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Invalid email or password.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <MarketingShell compact>
      <div className="mx-auto flex min-h-[70vh] max-w-lg items-center justify-center">
        <Card className="brand-panel w-full border backdrop-blur-xl">
          <CardHeader className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
              Direct URL access
            </p>
            <CardTitle className="text-3xl font-semibold text-slate-950">{config.label} access</CardTitle>
            <CardDescription className="text-base text-slate-500">{config.loginDescription}</CardDescription>
          </CardHeader>

          <CardContent className="space-y-5">
            <form onSubmit={handleSubmit} className="space-y-4">
              <Field label="Email">
                <Input
                  type="email"
                  placeholder="name@domain.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  disabled={isLoading}
                  className="border-slate-200 bg-white/75"
                />
              </Field>

              <Field label="Password">
                <Input
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  disabled={isLoading}
                  className="border-slate-200 bg-white/75"
                />
              </Field>

              {error ? <ErrorNotice message={error} /> : null}

              {!error && authError ? (
                <div className="flex gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-3">
                  <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-700" />
                  <p className="text-sm text-blue-800">{authError}</p>
                </div>
              ) : null}

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
                  "Sign in"
                )}
              </Button>
            </form>

            <div className="border-t border-slate-200 pt-5 text-sm text-slate-500">
              <p>
                Need to activate access?{" "}
                <Link href={`/${portal}/signup`} className="font-medium text-slate-950">
                  Open setup
                </Link>
              </p>
              <p className="mt-2">
                <Link href="/forgot-password" className="font-medium text-slate-950">
                  Forgot your password?
                </Link>
              </p>
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
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
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
  const [notice, setNotice] = useState("");
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
    setNotice("");

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
        directRole: config.directSignupRole,
        token: token || undefined,
      });

      if (!token && createdUser.approvalStatus === 'pending') {
        setNotice('Your account request has been created and is waiting for super admin approval.');
        return;
      }

      const profile = await login(formData.email, formData.password);

      if (!config.acceptedRoles.includes(profile.role || createdUser.role)) {
        throw new Error(`This account belongs on /${getPortalForRole(profile.role || createdUser.role)} instead.`);
      }

      navigate(getDefaultRouteForRole(profile.role || createdUser.role));
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
      <div className="mx-auto flex min-h-[78vh] max-w-xl items-center justify-center">
        <Card className="brand-panel w-full border backdrop-blur-xl">
          <CardHeader className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
              Direct URL access
            </p>
            <CardTitle className="text-3xl font-semibold text-slate-950">{config.label} setup</CardTitle>
            <CardDescription className="text-base text-slate-500">{subtitle}</CardDescription>
          </CardHeader>

          <CardContent className="space-y-5">
            {invite ? (
              <div className="rounded-3xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
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
                {invite.hostel ? (
                  <p>
                    Hostel: <span className="font-medium">{invite.hostel}</span>
                  </p>
                ) : null}
              </div>
            ) : null}

            <form onSubmit={handleSubmit} className="space-y-4">
              <Field label="Full name">
                <Input
                  value={formData.name}
                  onChange={(event) => handleChange("name", event.target.value)}
                  placeholder="Enter your full name"
                  className="border-slate-200 bg-white/75"
                  disabled={isSubmitting || inviteLoading}
                  required
                />
              </Field>

              <Field label="Email">
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(event) => handleChange("email", event.target.value)}
                  placeholder="name@domain.com"
                  className="border-slate-200 bg-white/75"
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
                    className="border-slate-200 bg-white/75"
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
                    className="border-slate-200 bg-white/75"
                    disabled={isSubmitting || inviteLoading}
                    required
                  />
                </Field>
              </div>

              {error ? <ErrorNotice message={error} /> : null}
              {notice ? <SuccessNotice message={notice} /> : null}

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
                  "Create access"
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
      <div className="mx-auto flex min-h-[78vh] max-w-xl items-center justify-center">
        <Card className="brand-panel w-full border backdrop-blur-xl">
          <CardContent className="py-16 text-center text-slate-500">Loading access setup...</CardContent>
        </Card>
      </div>
    </MarketingShell>
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

function SuccessNotice({ message }: { message: string }) {
  return (
    <div className="flex gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-3">
      <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-700" />
      <p className="text-sm text-blue-800">{message}</p>
    </div>
  );
}
