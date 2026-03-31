"use client";

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, CheckCircle2, LockKeyhole, UserRound } from "lucide-react";

import { Link } from "@/components/app-link";
import { MarketingShell } from "@/components/marketing-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/lib/auth-context";
import { getDefaultRouteForRole } from "@/lib/firebase/auth";

const quickPoints = [
  "Start with your student ID.",
  "Continue with your existing password or complete account setup.",
  "Track requests and approvals from one dashboard.",
];

const supportLinks = [
  { href: "/faqs", label: "FAQs" },
  { href: "/help", label: "Help" },
  { href: "/forgot-password", label: "Forgot password" },
];

export default function Home() {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && user) {
      navigate(getDefaultRouteForRole(user.role));
    }
  }, [isLoading, navigate, user]);

  return (
    <MarketingShell>
      <section className="mx-auto grid max-w-5xl gap-6 py-12 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white/85 px-4 py-2 text-sm font-medium text-slate-700">
            <LockKeyhole className="h-4 w-4 text-blue-700" />
            Student access only
          </div>

          <div className="space-y-4">
            <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
              Student exit pass access, cleaned up and easy to use.
            </h1>
            <p className="max-w-2xl text-base leading-7 text-slate-600">
              Sign in, finish your account setup, and manage your pass requests from one simple flow.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="brand-cta rounded-full border-0 px-7">
              <Link href="/login">
                Open student login
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="rounded-full border-white/80 bg-white/75 px-7 text-slate-900 hover:bg-white"
            >
              <Link href="/forgot-password">Reset password</Link>
            </Button>
          </div>

          <p className="text-sm text-slate-500">
            Admin and staff access remain on dedicated URLs and are no longer listed on the public entry page.
          </p>
        </div>

        <Card className="brand-panel border">
          <CardContent className="space-y-5 p-6">
            <div className="flex items-center gap-3">
              <span className="brand-mark inline-flex h-11 w-11 items-center justify-center rounded-2xl text-white">
                <UserRound className="h-5 w-5" />
              </span>
              <div>
                <p className="text-lg font-semibold text-slate-950">Quick start</p>
                <p className="text-sm text-slate-500">A compact student-first access flow.</p>
              </div>
            </div>

            <div className="space-y-3">
              {quickPoints.map((point) => (
                <div
                  key={point}
                  className="flex items-start gap-3 rounded-2xl border border-blue-100/80 bg-white/80 px-4 py-3"
                >
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-blue-700" />
                  <p className="text-sm text-slate-600">{point}</p>
                </div>
              ))}
            </div>

            <div>
              
            </div>

            <div className="border-t border-slate-200 pt-4">
              <p className="mb-3 text-sm font-medium text-slate-950">Need help?</p>
              <div className="flex flex-wrap gap-3">
                {supportLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="rounded-full border border-blue-100 bg-white/80 px-4 py-2 text-sm text-slate-700 transition hover:border-blue-300 hover:text-slate-950"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    </MarketingShell>
  );
}
