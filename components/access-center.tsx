"use client";

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  KeyRound,
  Loader2,
  ShieldCheck,
  UserRoundSearch,
} from "lucide-react";

import { MarketingShell } from "@/components/marketing-shell";
import { Link } from "@/components/app-link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { apiService } from "@/lib/api-service";
import { useAuth } from "@/lib/auth-context";
import { getDefaultRouteForRole } from "@/lib/firebase/auth";
import type { Hostel, StudentAccessLookup } from "@/lib/types";

type StudentStep =
  | "identify"
  | "existing"
  | "profile"
  | "academic"
  | "residence"
  | "contacts"
  | "credentials";

const onboardingSteps: Array<{ id: Exclude<StudentStep, "identify" | "existing">; label: string }> = [
  { id: "profile", label: "Name" },
  { id: "academic", label: "School" },
  { id: "residence", label: "Hostel" },
  { id: "contacts", label: "Contacts" },
  { id: "credentials", label: "Access" },
];

function normalizeMatric(value: string) {
  return value.trim().replace(/\s+/g, "").toUpperCase();
}

function maskEmail(email: string) {
  const [local, domain] = email.split("@");

  if (!local || !domain) {
    return email;
  }

  if (local.length <= 2) {
    return `${local[0] || "*"}***@${domain}`;
  }

  return `${local.slice(0, 2)}${"*".repeat(Math.max(2, local.length - 2))}@${domain}`;
}

export function AccessCenter() {
  const navigate = useNavigate();
  const { login, resetPassword, error: authError } = useAuth();
  const [hostels, setHostels] = useState<Hostel[]>([]);
  const [step, setStep] = useState<StudentStep>("identify");
  const [lookupUser, setLookupUser] = useState<StudentAccessLookup["user"]>(null);
  const [existingPassword, setExistingPassword] = useState("");
  const [studentId, setStudentId] = useState("");
  const [formData, setFormData] = useState({
    matric: "",
    name: "",
    department: "",
    faculty: "",
    level: "",
    hostel: "",
    room: "",
    phone: "",
    guardianPhone: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    void apiService
      .getHostels()
      .then((items) => setHostels(items))
      .catch(() => setHostels([]));
  }, []);

  const currentOnboardingIndex = useMemo(
    () => onboardingSteps.findIndex((item) => item.id === step),
    [step],
  );

  const stepTitle = useMemo(() => {
    switch (step) {
      case "identify":
        return {
          title: "Enter your student ID",
          description: "We’ll check whether your account already exists, then guide you to sign in or finish setup.",
        };
      case "existing":
        return {
          title: "Welcome back",
          description: "Your student record was found. Enter your password to continue.",
        };
      case "profile":
        return {
          title: "Enter your full name",
          description: "Let’s start your student profile with the name staff will see on requests and approvals.",
        };
      case "academic":
        return {
          title: "Add your school details",
          description: "Enter the faculty, department, and level connected to your student ID.",
        };
      case "residence":
        return {
          title: "Add your hostel details",
          description: "Tell us the hostel name and room or hostel number tied to your accommodation.",
        };
      case "contacts":
        return {
          title: "Add contact numbers",
          description: "We need your phone number and your guardian’s phone number for the student record.",
        };
      case "credentials":
        return {
          title: "Create your access",
          description: "Finish with the email and password you’ll use to sign in next time.",
        };
    }
  }, [step]);

  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };

  const resetStudentFlow = () => {
    setStep("identify");
    setLookupUser(null);
    setExistingPassword("");
    setStudentId("");
    setFormData({
      matric: "",
      name: "",
      department: "",
      faculty: "",
      level: "",
      hostel: "",
      room: "",
      phone: "",
      guardianPhone: "",
      email: "",
      password: "",
      confirmPassword: "",
    });
    setError("");
    setNotice("");
  };

  const handleIdentify = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setNotice("");

    const normalizedId = normalizeMatric(studentId);

    if (!normalizedId) {
      setError("Enter your student ID to continue.");
      return;
    }

    setIsLoading(true);

    try {
      const result = await apiService.lookupStudentAccess(normalizedId);
      setLookupUser(result.user);
      setFormData((current) => ({
        ...current,
        matric: normalizedId,
        name: result.user?.name || current.name,
        department: result.user?.department || current.department,
        faculty: result.user?.faculty || current.faculty,
        level: result.user?.level || current.level,
        hostel: result.user?.hostel || current.hostel,
        room: result.user?.room || current.room,
        email: result.user?.email || current.email,
      }));
      setStep(result.exists ? "existing" : "profile");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "We could not check that student ID.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleExistingLogin = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!lookupUser?.email) {
      setError("We could not load the email attached to this account.");
      return;
    }

    setError("");
    setNotice("");
    setIsLoading(true);

    try {
      const profile = await login(lookupUser.email, existingPassword);
      navigate(getDefaultRouteForRole(profile.role));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to sign you in.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleExistingReset = async () => {
    if (!lookupUser?.email) {
      return;
    }

    setError("");
    setNotice("");
    setIsLoading(true);

    try {
      await resetPassword(lookupUser.email);
      setNotice(`Password reset email sent to ${maskEmail(lookupUser.email)}.`);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to send the reset email.");
    } finally {
      setIsLoading(false);
    }
  };

  const continueOnboarding = () => {
    setError("");
    setNotice("");

    if (step === "profile") {
      if (!formData.name.trim()) {
        setError("Enter your full name to continue.");
        return;
      }

      setStep("academic");
      return;
    }

    if (step === "academic") {
      if (!formData.faculty.trim() || !formData.department.trim() || !formData.level.trim()) {
        setError("Enter your faculty, department, and level.");
        return;
      }

      setStep("residence");
      return;
    }

    if (step === "residence") {
      if (!formData.hostel.trim() || !formData.room.trim()) {
        setError("Enter your hostel name and room or hostel number.");
        return;
      }

      setStep("contacts");
      return;
    }

    if (step === "contacts") {
      if (!formData.phone.trim() || !formData.guardianPhone.trim()) {
        setError("Enter your phone number and guardian phone number.");
        return;
      }

      setStep("credentials");
    }
  };

  const goBack = () => {
    setError("");
    setNotice("");

    if (step === "existing" || step === "profile") {
      setStep("identify");
      return;
    }

    if (step === "academic") {
      setStep("profile");
      return;
    }

    if (step === "residence") {
      setStep("academic");
      return;
    }

    if (step === "contacts") {
      setStep("residence");
      return;
    }

    if (step === "credentials") {
      setStep("contacts");
    }
  };

  const handleCreateAccount = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setNotice("");

    if (!formData.email.trim()) {
      setError("Enter your email address to create access.");
      return;
    }

    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsLoading(true);

    try {
      await apiService.createStudentAccessAccount({
        name: formData.name.trim(),
        email: formData.email.trim(),
        matric: formData.matric,
        department: formData.department.trim(),
        faculty: formData.faculty.trim(),
        level: formData.level.trim(),
        hostel: formData.hostel.trim(),
        room: formData.room.trim(),
        phone: formData.phone.trim(),
        guardianPhone: formData.guardianPhone.trim(),
        password: formData.password,
      });

      const profile = await login(formData.email, formData.password);
      navigate(getDefaultRouteForRole(profile.role));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to create your account.");
    } finally {
      setIsLoading(false);
    }
  };

  const showAuthNotice = !error && authError && (step === "identify" || step === "existing");

  return (
    <MarketingShell compact>
      <div className="mx-auto flex min-h-[78vh] max-w-6xl items-center justify-center">
        <div className="grid w-full gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <Card className="brand-panel border backdrop-blur-xl">
            <CardHeader className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="brand-mark flex h-14 w-14 items-center justify-center rounded-2xl text-white">
                  {step === "existing" ? <KeyRound className="h-6 w-6" /> : <UserRoundSearch className="h-6 w-6" />}
                </div>
                <div>
                  <CardTitle className="text-3xl font-semibold text-slate-950">{stepTitle.title}</CardTitle>
                  <CardDescription className="mt-2 text-base text-slate-500">
                    {stepTitle.description}
                  </CardDescription>
                </div>
              </div>

              {currentOnboardingIndex >= 0 ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                    <span>Student setup</span>
                    <span>
                      Step {currentOnboardingIndex + 1} of {onboardingSteps.length}
                    </span>
                  </div>
                  <div className="grid grid-cols-5 gap-2">
                    {onboardingSteps.map((item, index) => (
                      <div key={item.id} className="space-y-2">
                        <div
                          className={`h-2 rounded-full ${
                            index <= currentOnboardingIndex ? "bg-blue-600" : "bg-slate-200"
                          }`}
                        />
                        <p className="text-xs text-slate-500">{item.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </CardHeader>

            <CardContent className="space-y-5">
              <div className="rounded-[1.5rem] border border-blue-100/90 bg-white/80 px-4 py-3 text-sm text-slate-600">
                <p className="font-medium text-slate-950">Student ID</p>
                <p className="mt-1">{formData.matric || normalizeMatric(studentId) || "Not entered yet"}</p>
              </div>

              {step === "identify" ? (
                <form onSubmit={handleIdentify} className="space-y-4">
                  <Field label="Student ID">
                    <Input
                      value={studentId}
                      onChange={(event) => setStudentId(event.target.value)}
                      placeholder="2024/001"
                      className="border-slate-200 bg-white/80"
                      disabled={isLoading}
                      autoFocus
                    />
                  </Field>

                  <Button type="submit" disabled={isLoading || !studentId.trim()} className="brand-cta h-11 w-full rounded-full">
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Checking ID...
                      </>
                    ) : (
                      <>
                        Continue
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </form>
              ) : null}

              {step === "existing" ? (
                <form onSubmit={handleExistingLogin} className="space-y-4">
                  <div className="rounded-[1.5rem] border border-blue-100/90 bg-blue-50/70 p-4 text-sm text-blue-900">
                    <p className="font-semibold">{lookupUser?.name || "Student account found"}</p>
                    <p className="mt-1">
                      Sign in with the email already linked to this ID:{" "}
                      <span className="font-medium">{lookupUser?.email ? maskEmail(lookupUser.email) : "Not available"}</span>
                    </p>
                  </div>

                  <Field label="Password">
                    <Input
                      type="password"
                      value={existingPassword}
                      onChange={(event) => setExistingPassword(event.target.value)}
                      placeholder="Enter your password"
                      className="border-slate-200 bg-white/80"
                      disabled={isLoading}
                      autoFocus
                    />
                  </Field>

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <Button type="submit" disabled={isLoading || !existingPassword} className="brand-cta h-11 flex-1 rounded-full">
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Signing in...
                        </>
                      ) : (
                        "Sign In"
                      )}
                    </Button>
                    <Button type="button" variant="outline" onClick={handleExistingReset} disabled={isLoading} className="h-11 rounded-full">
                      Forgot password
                    </Button>
                  </div>
                </form>
              ) : null}

              {step === "profile" ? (
                <div className="space-y-4">
                  <Field label="Full name">
                    <Input
                      value={formData.name}
                      onChange={(event) => handleChange("name", event.target.value)}
                      placeholder="Ada Okafor"
                      className="border-slate-200 bg-white/80"
                      disabled={isLoading}
                      autoFocus
                    />
                  </Field>
                </div>
              ) : null}

              {step === "academic" ? (
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Faculty">
                    <Input
                      value={formData.faculty}
                      onChange={(event) => handleChange("faculty", event.target.value)}
                      placeholder="Science"
                      className="border-slate-200 bg-white/80"
                      disabled={isLoading}
                    />
                  </Field>
                  <Field label="Department">
                    <Input
                      value={formData.department}
                      onChange={(event) => handleChange("department", event.target.value)}
                      placeholder="Computer Science"
                      className="border-slate-200 bg-white/80"
                      disabled={isLoading}
                    />
                  </Field>
                  <Field label="Level">
                    <Input
                      value={formData.level}
                      onChange={(event) => handleChange("level", event.target.value)}
                      placeholder="200"
                      className="border-slate-200 bg-white/80"
                      disabled={isLoading}
                    />
                  </Field>
                </div>
              ) : null}

              {step === "residence" ? (
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Hostel name">
                    {hostels.length ? (
                      <select
                        value={formData.hostel}
                        onChange={(event) => handleChange("hostel", event.target.value)}
                        className="flex h-10 w-full rounded-md border border-slate-200 bg-white/80 px-3 py-2 text-sm text-slate-950"
                        disabled={isLoading}
                      >
                        <option value="">Select hostel</option>
                        {hostels.map((hostel) => (
                          <option key={hostel.id} value={hostel.name}>
                            {hostel.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <Input
                        value={formData.hostel}
                        onChange={(event) => handleChange("hostel", event.target.value)}
                        placeholder="Hall A"
                        className="border-slate-200 bg-white/80"
                        disabled={isLoading}
                      />
                    )}
                  </Field>
                  <Field label="Room or hostel number">
                    <Input
                      value={formData.room}
                      onChange={(event) => handleChange("room", event.target.value)}
                      placeholder="301"
                      className="border-slate-200 bg-white/80"
                      disabled={isLoading}
                    />
                  </Field>
                </div>
              ) : null}

              {step === "contacts" ? (
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Phone number">
                    <Input
                      value={formData.phone}
                      onChange={(event) => handleChange("phone", event.target.value)}
                      placeholder="08012345678"
                      className="border-slate-200 bg-white/80"
                      disabled={isLoading}
                    />
                  </Field>
                  <Field label="Guardian phone number">
                    <Input
                      value={formData.guardianPhone}
                      onChange={(event) => handleChange("guardianPhone", event.target.value)}
                      placeholder="08087654321"
                      className="border-slate-200 bg-white/80"
                      disabled={isLoading}
                    />
                  </Field>
                </div>
              ) : null}

              {step === "credentials" ? (
                <form onSubmit={handleCreateAccount} className="grid gap-4 md:grid-cols-2">
                  <Field label="Email address">
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(event) => handleChange("email", event.target.value)}
                      placeholder="student@school.edu"
                      className="border-slate-200 bg-white/80"
                      disabled={isLoading}
                    />
                  </Field>
                  <div />
                  <Field label="Password">
                    <Input
                      type="password"
                      value={formData.password}
                      onChange={(event) => handleChange("password", event.target.value)}
                      placeholder="Minimum 8 characters"
                      className="border-slate-200 bg-white/80"
                      disabled={isLoading}
                    />
                  </Field>
                  <Field label="Confirm password">
                    <Input
                      type="password"
                      value={formData.confirmPassword}
                      onChange={(event) => handleChange("confirmPassword", event.target.value)}
                      placeholder="Repeat your password"
                      className="border-slate-200 bg-white/80"
                      disabled={isLoading}
                    />
                  </Field>

                  <div className="md:col-span-2 rounded-[1.5rem] border border-blue-100/90 bg-white/80 p-4 text-sm text-slate-600">
                    <p className="font-medium text-slate-950">Account summary</p>
                    <p className="mt-2">
                      {formData.name}, {formData.faculty} / {formData.department}, {formData.level} level.
                    </p>
                    <p className="mt-1">
                      {formData.hostel} hostel, room {formData.room}.
                    </p>
                  </div>

                  <div className="md:col-span-2">
                    <Button type="submit" disabled={isLoading} className="brand-cta h-11 w-full rounded-full">
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating account...
                        </>
                      ) : (
                        "Create Student Access"
                      )}
                    </Button>
                  </div>
                </form>
              ) : null}

              {(step === "profile" || step === "academic" || step === "residence" || step === "contacts") ? (
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button type="button" variant="outline" onClick={goBack} className="h-11 rounded-full">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>
                  <Button type="button" onClick={continueOnboarding} className="brand-cta h-11 flex-1 rounded-full">
                    Continue
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              ) : null}

              {error ? <ErrorNotice message={error} /> : null}

              {!error && notice ? (
                <div className="rounded-2xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
                  {notice}
                </div>
              ) : null}

              {!error && showAuthNotice ? (
                <div className="rounded-2xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
                  {authError}
                </div>
              ) : null}

              {step !== "identify" ? (
                <div className="border-t border-slate-200 pt-5 text-sm text-slate-500">
                  <button type="button" onClick={resetStudentFlow} className="font-medium text-slate-950">
                    Start again with a different student ID
                  </button>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="brand-panel border">
              <CardHeader className="space-y-3">
                <div className="brand-icon-chip flex h-14 w-14 items-center justify-center rounded-2xl border text-slate-950">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <CardTitle className="text-2xl font-semibold text-slate-950">Staff and admin access</CardTitle>
                <CardDescription className="text-base text-slate-500">
                  Admins, chaplaincy, and security keep a separate email-based access flow with invite activation where needed.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-3">
                <PortalButton href="/admin" label="Admin portal" description="Hall admin and super admin access" />
                <PortalButton href="/chaplaincy" label="Chaplaincy portal" description="Review and chapel workflow" />
                <PortalButton href="/security" label="Security portal" description="Scanner and gate verification" />
                <PortalButton href="/staff-join" label="Activate staff invite" description="Create access from an invite or lead email" />
              </CardContent>
            </Card>

            <Card className="brand-panel-soft border">
              <CardContent className="p-6 text-sm leading-7 text-slate-600">
                <p className="font-semibold text-slate-950">How it works</p>
                <p className="mt-3">
                  Students start with their ID. Existing accounts move straight to password entry,
                  while new students finish onboarding in guided steps before creating access.
                </p>
                <p className="mt-3">
                  Staff keep their own role-specific route so approvals, scanning, and admin access stay separated and secure.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
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

function ErrorNotice({ message }: { message: string }) {
  return (
    <div className="flex gap-3 rounded-2xl border border-destructive/20 bg-destructive/10 p-3">
      <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-destructive" />
      <p className="text-sm text-destructive">{message}</p>
    </div>
  );
}

function PortalButton({
  href,
  label,
  description,
}: {
  href: string;
  label: string;
  description: string;
}) {
  return (
    <Link href={href} className="block rounded-[1.35rem] border border-blue-100/80 bg-white/88 p-4 transition hover:border-blue-300 hover:bg-white">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-slate-950">{label}</p>
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        </div>
        <Building2 className="mt-0.5 h-5 w-5 text-blue-700" />
      </div>
    </Link>
  );
}
