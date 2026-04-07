"use client";

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  KeyRound,
  Loader2,
  UserRoundSearch,
} from "lucide-react";

import { MarketingShell } from "@/components/marketing-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { apiService } from "@/lib/api-service";
import { useAuth } from "@/lib/auth-context";
import { getDefaultRouteForRole } from "@/lib/firebase/auth";
import {
  FACULTY_OPTIONS,
  LEVEL_OPTIONS,
  ROOM_FORMAT_HINT,
  getDepartmentsForFaculty,
  isValidDepartmentForFaculty,
  isValidRoom,
  normalizeFaculty,
  normalizeRoom,
  parseStudentLevel,
} from "@/lib/student-profile";
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

function isValidMatric(value: string) {
  return /^\d{2}\/\d{4}$/.test(normalizeMatric(value));
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

function isKnownHostel(hostels: Hostel[], hostelValue: string) {
  return hostels.some((hostel) => hostel.name === hostelValue);
}

export function AccessCenter() {
  const navigate = useNavigate();
  const { login, resetPassword, signup, error: authError } = useAuth();
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

  const departmentOptions = useMemo(
    () => getDepartmentsForFaculty(formData.faculty),
    [formData.faculty],
  );

  const currentOnboardingIndex = useMemo(
    () => onboardingSteps.findIndex((item) => item.id === step),
    [step],
  );

  const stepTitle = useMemo(() => {
    switch (step) {
      case "identify":
        return {
          title: "Student login",
          description: "Enter your student ID to continue.",
        };
      case "existing":
        return {
          title: "Welcome back",
          description: "Enter the password linked to this student account.",
        };
      case "profile":
        return {
          title: "Your full name",
          description: "Add the name attached to your student record.",
        };
      case "academic":
        return {
          title: "Academic details",
          description: "Add your faculty, department, and level.",
        };
      case "residence":
        return {
          title: "Residence details",
          description: "Add your hostel and room information.",
        };
      case "contacts":
        return {
          title: "Contact details",
          description: "Add your phone number and guardian contact.",
        };
      case "credentials":
        return {
          title: "Create your access",
          description: "Finish with the email and password for future sign-in.",
        };
    }
  }, [step]);

  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData((current) => {
      if (field === "faculty") {
        const faculty = normalizeFaculty(value);
        const nextDepartments = getDepartmentsForFaculty(faculty);

        return {
          ...current,
          faculty,
          department: nextDepartments.includes(current.department) ? current.department : "",
        };
      }

      if (field === "room") {
        return {
          ...current,
          room: normalizeRoom(value),
        };
      }

      return { ...current, [field]: value };
    });
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

    if (!isValidMatric(normalizedId)) {
      setError("Student ID must be in the format 12/3456.");
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
        faculty: result.user?.faculty ? normalizeFaculty(result.user.faculty) : current.faculty,
        level: result.user?.level ? String(result.user.level) : current.level,
        hostel: result.user?.hostel || current.hostel,
        room: result.user?.room ? normalizeRoom(result.user.room) : current.room,
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
      const selectedLevel = parseStudentLevel(formData.level);

      if (!formData.faculty.trim() || !formData.department.trim() || !selectedLevel) {
        setError("Select your faculty, department, and level.");
        return;
      }

      if (!isValidDepartmentForFaculty(formData.faculty, formData.department)) {
        setError("Select a department that matches the chosen faculty.");
        return;
      }

      setStep("residence");
      return;
    }

    if (step === "residence") {
      if (!hostels.length) {
        setError("No hostels are available yet. Ask the super admin to create hostels first.");
        return;
      }

      if (!formData.hostel.trim() || !formData.room.trim()) {
        setError("Select your hostel and enter your room number.");
        return;
      }

      if (!isKnownHostel(hostels, formData.hostel)) {
        setError("Select a hostel created by the super admin.");
        return;
      }

      if (!isValidRoom(formData.room)) {
        setError("Room number must be a letter A to L followed by a number from 1 to 25.");
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

    const selectedLevel = parseStudentLevel(formData.level);

    if (!selectedLevel) {
      setError("Select a valid level between 100 and 500.");
      return;
    }

    if (!isValidDepartmentForFaculty(formData.faculty, formData.department)) {
      setError("Select a department that matches the chosen faculty.");
      return;
    }

    if (!isKnownHostel(hostels, formData.hostel)) {
      setError("Select a hostel created by the super admin.");
      return;
    }

    if (!isValidRoom(formData.room)) {
      setError("Room number must be a letter A to L followed by a number from 1 to 25.");
      return;
    }

    setIsLoading(true);

    try {
      const profile = await signup({
        name: formData.name.trim(),
        email: formData.email.trim(),
        matric: formData.matric,
        department: formData.department.trim(),
        faculty: normalizeFaculty(formData.faculty),
        level: selectedLevel,
        hostel: formData.hostel.trim(),
        room: normalizeRoom(formData.room),
        phone: formData.phone.trim(),
        guardianPhone: formData.guardianPhone.trim(),
        password: formData.password,
      });
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
      <div className="mx-auto flex min-h-[78vh] max-w-2xl items-center justify-center">
        <Card className="brand-panel w-full border backdrop-blur-xl">
          <CardHeader className="space-y-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="brand-mark flex h-14 w-14 items-center justify-center rounded-2xl text-white">
                  {step === "existing" ? <KeyRound className="h-6 w-6" /> : <UserRoundSearch className="h-6 w-6" />}
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
                    Student access
                  </p>
                  <CardTitle className="text-3xl font-semibold text-slate-950">{stepTitle.title}</CardTitle>
                  <CardDescription className="max-w-xl text-base text-slate-500">
                    {stepTitle.description}
                  </CardDescription>
                </div>
              </div>

              {currentOnboardingIndex >= 0 ? (
                <div className="rounded-full border border-blue-100 bg-white/85 px-4 py-2 text-sm font-medium text-slate-600">
                  Step {currentOnboardingIndex + 1} of {onboardingSteps.length}
                </div>
              ) : null}
            </div>

            {currentOnboardingIndex >= 0 ? (
              <div className="grid grid-cols-5 gap-2">
                {onboardingSteps.map((item, index) => (
                  <div key={item.id} className="space-y-2">
                    <div
                      className={`h-2 rounded-full ${
                        index <= currentOnboardingIndex ? "bg-blue-600" : "bg-slate-200"
                      }`}
                    />
                    <p className="text-[11px] text-slate-500">{item.label}</p>
                  </div>
                ))}
              </div>
            ) : null}
          </CardHeader>

          <CardContent className="space-y-5">
            <div className="rounded-[1.5rem] border border-blue-100/90 bg-white/85 px-4 py-3 text-sm text-slate-600">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium text-slate-950">Student ID</p>
                  <p className="mt-1">{formData.matric || normalizeMatric(studentId) || "Not entered yet"}</p>
                </div>

                {step === "existing" && lookupUser?.email ? (
                  <div className="text-sm text-slate-500 sm:text-right">
                    <p className="font-medium text-slate-950">{lookupUser.name || "Student account found"}</p>
                    <p className="mt-1">{maskEmail(lookupUser.email)}</p>
                  </div>
                ) : (
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-400"></p>
                )}
              </div>
            </div>

            {step === "identify" ? (
              <form onSubmit={handleIdentify} className="space-y-4">
                <Field label="Student ID">
                  <Input
                    value={studentId}
                    onChange={(event) => setStudentId(event.target.value)}
                    placeholder="12/3456"
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
                      "Sign in"
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
                    placeholder="Enter your full name"
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
                  <select
                    value={formData.faculty}
                    onChange={(event) => handleChange("faculty", event.target.value)}
                    className="flex h-10 w-full rounded-md border border-slate-200 bg-white/80 px-3 py-2 text-sm text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={isLoading}
                  >
                    <option value="">Select faculty</option>
                    {FACULTY_OPTIONS.map((faculty) => (
                      <option key={faculty.value} value={faculty.value}>
                        {faculty.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Department">
                  <select
                    value={formData.department}
                    onChange={(event) => handleChange("department", event.target.value)}
                    className="flex h-10 w-full rounded-md border border-slate-200 bg-white/80 px-3 py-2 text-sm text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={isLoading || !departmentOptions.length}
                  >
                    <option value="">
                      {departmentOptions.length ? "Select department" : "Select faculty first"}
                    </option>
                    {departmentOptions.map((department) => (
                      <option key={department} value={department}>
                        {department}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Level">
                  <select
                    value={formData.level}
                    onChange={(event) => handleChange("level", event.target.value)}
                    className="flex h-10 w-full rounded-md border border-slate-200 bg-white/80 px-3 py-2 text-sm text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={isLoading}
                  >
                    <option value="">Select level</option>
                    {LEVEL_OPTIONS.map((level) => (
                      <option key={level} value={String(level)}>
                        {level}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
            ) : null}

            {step === "residence" ? (
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Hostel">
                  <select
                    value={formData.hostel}
                    onChange={(event) => handleChange("hostel", event.target.value)}
                    className="flex h-10 w-full rounded-md border border-slate-200 bg-white/80 px-3 py-2 text-sm text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={isLoading || !hostels.length}
                  >
                    <option value="">{hostels.length ? "Select hostel" : "No hostels available"}</option>
                    {hostels.map((hostel) => (
                      <option key={hostel.id} value={hostel.name}>
                        {hostel.name}
                      </option>
                    ))}
                  </select>
                  {!hostels.length ? (
                    <p className="text-xs text-slate-500">
                      The super admin needs to create hostel options before students can continue.
                    </p>
                  ) : null}
                </Field>
                <Field label="Room number">
                  <Input
                    value={formData.room}
                    onChange={(event) => handleChange("room", event.target.value)}
                    placeholder="A21"
                    className="border-slate-200 bg-white/80"
                    disabled={isLoading}
                  />
                  <p className="text-xs text-slate-500">{ROOM_FORMAT_HINT}</p>
                </Field>
              </div>
            ) : null}

            {step === "contacts" ? (
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Phone number">
                  <Input
                    value={formData.phone}
                    onChange={(event) => handleChange("phone", event.target.value)}
                    placeholder="Phone number"
                    className="border-slate-200 bg-white/80"
                    disabled={isLoading}
                  />
                </Field>
                <Field label="Guardian phone">
                  <Input
                    value={formData.guardianPhone}
                    onChange={(event) => handleChange("guardianPhone", event.target.value)}
                    placeholder="Guardian phone"
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
                  <p className="font-medium text-slate-950">Summary</p>
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
                      "Create student access"
                    )}
                  </Button>
                </div>
              </form>
            ) : null}

            {step === "profile" || step === "academic" || step === "residence" || step === "contacts" ? (
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

            <div className="border-t border-slate-200 pt-5 text-xs uppercase tracking-[0.22em] text-slate-400">
              Dedicated student access form
            </div>
          </CardContent>
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

function ErrorNotice({ message }: { message: string }) {
  return (
    <div className="flex gap-3 rounded-2xl border border-destructive/20 bg-destructive/10 p-3">
      <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-destructive" />
      <p className="text-sm text-destructive">{message}</p>
    </div>
  );
}
