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
import type { StaffInvite } from "@/lib/types";

export default function StaffJoinPage() {
  return (
    <Suspense fallback={<StaffJoinFallback />}>
      <StaffJoinContent />
    </Suspense>
  );
}

function StaffJoinContent() {
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
          setError("This staff invite is invalid, expired, or already used.");
        }
      })
      .catch(() => setError("Unable to load that invite right now."))
      .finally(() => setInviteLoading(false));
  }, [token]);

  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

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
      navigate(getDefaultRouteForRole(profile.role || createdUser.role));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to create the staff account.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const subtitle = invite
    ? `${invite.role.replace("_", " ")} access${invite.hostel ? ` for ${invite.hostel}` : ""}`
    : "Complete staff access setup with an approved invitation.";

  return (
    <MarketingShell compact>
      <div className="mx-auto flex min-h-[78vh] max-w-2xl items-center justify-center">
        <Card className="w-full border-white/80 bg-white/80 shadow-[0_28px_90px_-50px_rgba(15,23,42,0.5)] backdrop-blur-xl">
          <CardHeader className="space-y-3">
            <CardTitle className="text-3xl font-semibold text-slate-950">Join staff access</CardTitle>
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
                  placeholder="staff@school.edu"
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

              {error && (
                <div className="flex gap-3 rounded-2xl border border-destructive/20 bg-destructive/10 p-3">
                  <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-destructive" />
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}

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
                <Link href="/login" className="font-medium text-slate-950">
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

function StaffJoinFallback() {
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

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      {children}
    </div>
  );
}
