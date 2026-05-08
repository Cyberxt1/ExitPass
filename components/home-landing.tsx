"use client";

import { useEffect, useState } from "react";
import {
  ArrowDown,
  ArrowRight,
  ChevronDown,
  CheckCircle2,
  Clock3,
  ScanLine,
  ShieldCheck,
} from "lucide-react";

import { Link } from "@/components/app-link";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { getDefaultRouteForRole } from "@/lib/firebase/auth";
import type { User } from "@/lib/types";

const missionFeatures = [
  "Students request movement without chasing paper slips.",
  "Chaplaincy and hall admins review the same live request record.",
  "Security verifies approved passes with a QR-backed flow.",
];

const faqItems = [
  {
    question: "Who should use this landing page?",
    answer:
      "It is the public front door for students. Staff and admins still use their dedicated portal routes.",
  },
  {
    question: "Does ExitPass keep the approval chain?",
    answer:
      "Yes. It preserves the chapel, hostel, and security flow while making every stage clearer to follow.",
  },
  {
    question: "Are hostel options controlled centrally?",
    answer:
      "Yes. Students can only choose hostel records created by the super admin.",
  },
];

const flowColumns = [
  {
    title: "Student Access",
    body: "Students sign in with the same identity they use for requests, so profile, hostel, and pass history stay aligned.",
  },
  {
    title: "Approval Chain",
    body: "Chaplaincy and hall admins see the request at the right stage with remarks, timestamps, and hostel context already attached.",
  },
  {
    title: "Gate Operations",
    body: "Security verifies the approved QR pass and records returns without losing the audit trail behind the movement.",
  },
];

export function HomeLanding({ user }: { user: User | null }) {
  const [hasScrolled, setHasScrolled] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  useEffect(() => {
    const elements = Array.from(document.querySelectorAll<HTMLElement>(".scroll-reveal"));
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
          }
        });
      },
      { threshold: 0.14 },
    );

    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const onScroll = () => setHasScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#040c1a] text-white">
      <div
        className="fixed inset-0 z-0"
        style={{
          backgroundImage:
            "linear-gradient(180deg, rgba(4,12,26,0.65) 0%, rgba(4,12,26,0.45) 35%, rgba(4,12,26,0.86) 100%), url('/background.jpg')",
          backgroundPosition: "center",
          backgroundSize: "cover",
        }}
      />
      <div className="fixed inset-0 z-0 bg-[radial-gradient(circle_at_top,rgba(90,172,240,0.18),transparent_28%),radial-gradient(circle_at_80%_18%,rgba(255,255,255,0.12),transparent_16%),linear-gradient(180deg,rgba(4,12,26,0.1),rgba(4,12,26,0.56))]" />
      <div className="fixed inset-0 z-0 bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:48px_48px] opacity-25 [mask-image:linear-gradient(180deg,rgba(0,0,0,0.55),transparent_88%)]" />

      <div className="relative z-10">
        <header
          className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
            hasScrolled
              ? "border-b border-white/10 bg-[#071221]/70 shadow-[0_20px_60px_-40px_rgba(0,0,0,0.95)] backdrop-blur-2xl"
              : "border-b border-transparent bg-transparent"
          }`}
        >
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
            <a href="#top" className="flex items-center gap-3">
              {/* <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#90cbf8,#5aacf0_45%,#102040)] text-sm font-semibold tracking-[0.2em] text-[#040c1a] shadow-[0_20px_45px_-24px_rgba(144,203,248,0.95)]">
                EP
              </span> */}
              <div>
                <p className="text-sm font-extrabold uppercase tracking-[0.28em] text-white">ExitPass</p>
                <p className="text-xs text-[#a8bcd4]">Request, review, approve, and verify.</p>
              </div>
            </a>

            <nav className="hidden items-center gap-8 md:flex">
              <a
                href="#story"
                className="text-xs uppercase tracking-[0.18em] text-[#ccdcee] transition hover:text-white"
              >
                About
              </a>
              <a
                href="#flow"
                className="text-xs uppercase tracking-[0.18em] text-[#ccdcee] transition hover:text-white"
              >
                Features
              </a>
              <a
                href="#faq"
                className="text-xs uppercase tracking-[0.18em] text-[#ccdcee] transition hover:text-white"
              >
                FAQ
              </a>
            </nav>

            <div className="flex items-center gap-3">
              <ThemeToggle className="rounded-sm border border-white/16 bg-white/[0.06] text-white hover:bg-white/[0.12]" />
              <Button
                asChild
                className="rounded-sm border-0 bg-[#5aacf0] px-5 text-xs font-bold uppercase tracking-[0.18em] text-[#040c1a] hover:bg-[#90cbf8]"
              >
                <Link href={user ? getDefaultRouteForRole(user.role) : "/login"}>
                  {user ? "Dashboard" : "Student Access"}
                </Link>
              </Button>
            </div>
          </div>
        </header>

        <main id="top">
          <section className="min-h-screen px-4 pb-24 pt-34 sm:px-6 lg:px-8">
            <div className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-6xl flex-col justify-center">
              <div className="grid items-center gap-12 lg:grid-cols-[1fr_auto_1fr]">
                <div className="hidden text-right md:block">
                  <p className="text-[clamp(2.6rem,7vw,5rem)] font-thin uppercase tracking-[0.3em] text-white">
                    Request
                  </p>
                  <p className="ml-auto mt-6 max-w-[15rem] text-sm leading-7 text-[#ccdcee]">
                    Students start with their ID, then move through a guided pass flow.
                  </p>
                </div>

                <div className="relative mx-auto hidden justify-center md:flex">
                  <div className="absolute inset-x-10 top-8 h-20 rounded-full bg-[#90cbf8]/25 blur-3xl" />
                  <img
                    src="/der.png"
                    alt="ExitPass app screenshot"
                    className="relative z-10 h-auto w-[min(82vw,350px)] drop-shadow-[0_35px_80px_rgba(0,0,0,0.55)] sm:w-[320px] lg:w-[360px]"
                  />
                </div>

                <div className="mx-auto flex w-full max-w-md flex-col gap-4 md:hidden">
                  <div className="rounded-[1.75rem] border border-white/12 bg-white/[0.05] px-5 py-5 text-left backdrop-blur-sm">
                    <p className="text-[0.68rem] font-bold uppercase tracking-[0.28em] text-[#90cbf8]">
                      Exit flow
                    </p>
                    <p className="mt-3 text-2xl font-light leading-tight text-white">
                      One shared record from student request to gate return.
                    </p>
                    <p className="mt-3 text-sm leading-7 text-[#ccdcee]">
                      Students, chaplaincy, hall admins, and security stay aligned without paper slips or scattered updates.
                    </p>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    {['Request', 'Approve', 'Return'].map((step) => (
                      <div
                        key={step}
                        className="rounded-[1.2rem] border border-[#5aacf0]/18 bg-[#5aacf0]/8 px-3 py-3 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[#dcecff]"
                      >
                        {step}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="hidden items-start md:flex md:flex-col">
                  <p className="text-[clamp(2.6rem,7vw,5rem)] font-thin uppercase tracking-[0.3em] text-white">
                    Return
                  </p>
                  <a
                    href="#story"
                    className="mt-6 inline-flex flex-col items-start gap-2 text-[#90cbf8] transition hover:text-white"
                  >
                    <span className="text-[0.7rem] font-bold uppercase tracking-[0.24em]">
                      Begin the Flow
                    </span>
                    <ArrowDown className="h-5 w-5 animate-bounce" />
                  </a>
                </div>
              </div>

              <div className="scroll-reveal is-visible mt-14 flex flex-col items-center gap-5 md:mt-18">
                <h1 className="max-w-4xl text-center text-[clamp(2.6rem,6vw,5.3rem)] font-light leading-[1.05] tracking-[0.04em] text-white">
                  Student movement, approvals, and gate checks in one traceable flow.
                </h1>
                <p className="max-w-2xl text-center text-base leading-8 text-[#ccdcee] sm:text-lg">
                  ExitPass gives students, chaplaincy, hall admins, and security one shared system
                  for requesting, approving, scanning, and recording exits.
                </p>
                <div className="flex flex-col gap-3 pt-2 sm:flex-row">
                  <Button
                    asChild
                    className="h-12 rounded-sm border-0 bg-[#5aacf0] px-7 text-xs font-bold uppercase tracking-[0.18em] text-[#040c1a] hover:bg-[#90cbf8]"
                  >
                    <Link href="/login">
                      Open Student Access
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                  <a
                    href="#flow"
                    className="inline-flex h-12 items-center justify-center rounded-sm border border-white/20 px-7 text-xs font-bold uppercase tracking-[0.18em] text-white transition hover:border-[#90cbf8]/60 hover:bg-white/5"
                  >
                    See the Platform Story
                  </a>
                </div>
              </div>
            </div>
          </section>

          <section
            id="story"
            className="border-y border-white/8 bg-[radial-gradient(circle_at_center,rgba(255,245,200,0.1),transparent_28%),linear-gradient(180deg,rgba(6,14,31,0.82),rgba(10,24,46,0.92))] px-4 py-32 text-center sm:px-6 lg:px-8"
          >
            <div className="scroll-reveal mx-auto max-w-5xl">
              <Label centered>Shared Trail</Label>
              <h2 className="text-[clamp(2.3rem,5vw,4.5rem)] font-light leading-[1.08] text-white">
                Every exit starts with a visible trail, not scattered conversations.
              </h2>
              <p className="mx-auto mt-6 max-w-2xl text-lg font-light leading-8 text-[#ccdcee]">
                Students know what stage they are in. Reviewers know what has already been done.
                Security sees exactly what has been cleared for movement.
              </p>
            </div>
          </section>

          <section id="flow" className="bg-[rgba(5,13,28,0.92)] px-4 py-32 sm:px-6 lg:px-8">
            <div className="scroll-reveal mx-auto grid max-w-6xl items-center gap-14 lg:grid-cols-[1.05fr_0.95fr]">
              <div>
                <Label>The Mission</Label>
                <h2 className="text-[clamp(2rem,4.3vw,3.6rem)] font-light leading-[1.08] text-white">
                  A campus pass system that feels calm, clear, and accountable.
                </h2>
                <p className="mt-6 max-w-xl text-base leading-8 text-[#a8bcd4]">
                  ExitPass reduces uncertainty around student movement with one place for requests,
                  reviews, approvals, and gate scans.
                </p>
                <div className="mt-8 grid gap-4">
                  {missionFeatures.map((feature) => (
                    <div
                      key={feature}
                      className="flex items-start gap-3 rounded-[1.15rem] border border-[#5aacf0]/15 bg-white/[0.04] px-4 py-4"
                    >
                      <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#90cbf8]" />
                      <p className="text-sm leading-7 text-[#ccdcee]">{feature}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-5">
                <FeatureCard
                  icon={<Clock3 className="h-5 w-5" />}
                  title="Student Request"
                  body="Students start with a clear request form and live status updates."
                />
                <FeatureCard
                  icon={<ShieldCheck className="h-5 w-5" />}
                  title="Approval Routing"
                  body="Chaplaincy and hall admins act on the same record with preserved remarks."
                />
                <FeatureCard
                  icon={<ScanLine className="h-5 w-5" />}
                  title="Gate Verification"
                  body="Security scans approved passes and records returns with less friction."
                />
              </div>
            </div>
          </section>

          <section id="faq" className="bg-[#040c1a] px-4 py-32 sm:px-6 lg:px-8">
            <div className="scroll-reveal mx-auto mb-28 max-w-6xl">
              <div className="max-w-2xl">
                <Label>Platform Story</Label>
                <h2 className="text-[clamp(2rem,4vw,3.3rem)] font-light leading-[1.08] text-white">
                  One system for student requests, reviews, approvals, and return checks.
                </h2>
              </div>

              <div className="mt-10 grid gap-5 md:grid-cols-3">
                {flowColumns.map((column, index) => (
                  <div
                    key={column.title}
                    className="rounded-[1.5rem] border border-[#5aacf0]/14 bg-white/[0.04] p-6"
                  >
                    <p className="text-[0.65rem] font-bold uppercase tracking-[0.24em] text-[#90cbf8]">
                      0{index + 1}
                    </p>
                    <h3 className="mt-4 text-2xl font-medium text-white">{column.title}</h3>
                    <p className="mt-4 text-sm leading-7 text-[#a8bcd4]">{column.body}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mx-auto max-w-5xl">
              <div className="scroll-reveal max-w-2xl">
                <Label>FAQ</Label>
                <h2 className="text-[clamp(2.1rem,4.5vw,3.8rem)] font-light leading-[1.08] text-white">
                  Frequently asked questions about the public ExitPass flow.
                </h2>
              </div>

              <div className="mt-12 grid gap-4">
                {faqItems.map((item, index) => {
                  const isOpen = openFaq === index;

                  return (
                    <div
                      key={item.question}
                      className="scroll-reveal rounded-[1.55rem] border border-[#5aacf0]/14 bg-white/[0.04] transition-all duration-300"
                    >
                      <button
                        type="button"
                        onClick={() => setOpenFaq(isOpen ? null : index)}
                        className="flex w-full items-center justify-between gap-6 px-6 py-5 text-left"
                      >
                        <span className="text-lg font-medium text-white">{item.question}</span>
                        <span className="flex h-10 w-10 items-center justify-center rounded-full border border-[#5aacf0]/20 bg-[#5aacf0]/8 text-[#90cbf8]">
                          <ChevronDown
                            className={`h-4 w-4 transition-transform duration-300 ${
                              isOpen ? "rotate-180" : ""
                            }`}
                          />
                        </span>
                      </button>
                      <div
                        className={`grid transition-[grid-template-rows] duration-300 ${
                          isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                        }`}
                      >
                        <div className="overflow-hidden">
                          <div className="px-6 pb-6 text-sm leading-7 text-[#ccdcee]">
                            {item.answer}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="border-t border-white/8 bg-[linear-gradient(180deg,#081426,#040c1a)] px-4 py-32 text-center sm:px-6 lg:px-8">
            <div className="scroll-reveal mx-auto max-w-4xl">
              <Label centered>Open The Platform</Label>
              <h2 className="text-[clamp(2.4rem,5vw,4.4rem)] font-light leading-[1.05] text-white">
                Ready to move student requests through a cleaner approval path?
              </h2>
              <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-[#ccdcee]">
                Start with student access, then move requests through approval and return with a cleaner audit trail.
              </p>
              <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row">
                <Button
                  asChild
                  className="h-12 rounded-sm border-0 bg-[#5aacf0] px-8 text-xs font-bold uppercase tracking-[0.2em] text-[#040c1a] hover:bg-[#90cbf8]"
                >
                  <Link href="/login">
                    Open Student Access
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="h-12 rounded-sm border-white/20 bg-white/5 px-8 text-xs font-bold uppercase tracking-[0.2em] text-white hover:bg-white/10"
                >
                  <Link href="/forgot-password">Reset Password</Link>
                </Button>
              </div>
            </div>
          </section>
        </main>

        <footer className="relative overflow-hidden border-t border-white/8 bg-[#040c1a] px-4 py-14 sm:px-6 lg:px-8">
          <div className="pointer-events-none absolute inset-0">
            <div
              className="absolute left-[-4rem] top-8 h-32 w-32 rounded-full bg-[#90cbf8]/10 blur-3xl"
            />
            <div
              className="absolute right-[-2rem] top-12 h-40 w-40 rounded-full bg-white/8 blur-3xl"
            />
            <div
              className="absolute bottom-[-3rem] left-1/3 h-28 w-28 rounded-full bg-[#5aacf0]/10 blur-3xl"
            />
          </div>

          <div className="relative mx-auto flex max-w-6xl flex-col gap-10 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-sm">
              <p className="text-lg font-extrabold uppercase tracking-[0.24em] text-white">
                Exit<span className="text-[#90cbf8]">Pass</span>
              </p>
              <p className="mt-3 text-sm leading-7 text-[#a8bcd4]">
                Student exit management with clearer approvals, hostel-aware review, and security
                verification in one platform.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                {[
                  "Live approval trail",
                  "Hostel-aware review",
                  "QR verification",
                ].map((item, index) => (
                  <span
                    key={item}
                    className="rounded-full border border-[#5aacf0]/18 bg-white/[0.04] px-3 py-1.5 text-[0.68rem] font-bold uppercase tracking-[0.16em] text-[#dcecff]"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <div className="grid gap-8 sm:grid-cols-3">
              <FooterLinks
                title="Platform"
                links={[
                  { href: "#story", label: "About" },
                  { href: "#flow", label: "Features" },
                  { href: "#faq", label: "FAQ" },
                ]}
              />
              <FooterLinks
                title="Support"
                links={[
                  { href: "/faqs", label: "FAQs" },
                  { href: "/help", label: "Help" },
                  { href: "/forgot-password", label: "Forgot password" },
                ]}
              />
              <FooterLinks
                title="Access"
                links={[
                  { href: "/login", label: "Student access" },
                  { href: "/admin", label: "Admin portal" },
                  { href: "/security", label: "Security portal" },
                ]}
              />
            </div>
          </div>

          <div className="relative mx-auto mt-12 flex max-w-6xl flex-col gap-2 border-t border-white/8 pt-7 text-sm text-[#7a94b0] sm:flex-row sm:items-center sm:justify-between">
            <p>© 2026 ExitPass. All rights reserved.</p>
            <p>Built for traceable student movement.</p>
          </div>
        </footer>
      </div>
    </div>
  );
}

function Label({
  children,
  centered = false,
}: {
  children: React.ReactNode;
  centered?: boolean;
}) {
  return (
    <div
      className={`mb-6 inline-flex items-center gap-3 text-[0.64rem] font-bold uppercase tracking-[0.3em] text-[#5aacf0] ${
        centered ? "justify-center" : ""
      }`}
    >
      <span className="h-px w-8 bg-[#5aacf0]/55" />
      {children}
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-[1.5rem] border border-[#5aacf0]/14 bg-white/[0.04] p-6">
      <div className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#5aacf0]/20 bg-[#5aacf0]/10 text-[#90cbf8]">
        {icon}
      </div>
      <h3 className="mt-5 text-xl font-medium text-white">{title}</h3>
      <p className="mt-3 text-sm leading-7 text-[#a8bcd4]">{body}</p>
    </div>
  );
}

function FooterLinks({
  title,
  links,
}: {
  title: string;
  links: Array<{ href: string; label: string }>;
}) {
  return (
    <div>
      <p className="text-sm font-bold uppercase tracking-[0.2em] text-white">{title}</p>
      <div className="mt-4 flex flex-col gap-3">
        {links.map((link) =>
          link.href.startsWith("/") ? (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-[#a8bcd4] transition hover:text-white"
            >
              {link.label}
            </Link>
          ) : (
            <a
              key={link.href}
              href={link.href}
              className="text-sm text-[#a8bcd4] transition hover:text-white"
            >
              {link.label}
            </a>
          ),
        )}
      </div>
    </div>
  );
}
