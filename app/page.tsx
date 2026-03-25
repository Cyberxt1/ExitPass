"use client";

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BadgeCheck,
  Layers3,
  ScanLine,
  Sparkles,
  Zap,
} from 'lucide-react';

import { MarketingShell } from '@/components/marketing-shell';
import { Link } from '@/components/app-link';
import { ScrollReveal } from '@/components/scroll-reveal';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/lib/auth-context';
import { getDefaultRouteForRole } from '@/lib/firebase/auth';

const rotatingPhrases = [
  'Exit with ease',
  'Stay modern',
  'Book your pass with comfort',
  'Move in one clean flow',
  'Scan fast at the gate',
];

const floatingCards = [
  { title: 'Student lane', label: 'Request in seconds', tone: 'from-slate-950 to-blue-700' },
  { title: 'Admin lane', label: 'Approve with clarity', tone: 'from-blue-900 to-blue-500' },
  { title: 'Gate lane', label: 'Verify live QR', tone: 'from-slate-800 to-blue-600' },
];

export default function Home() {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const [phraseIndex, setPhraseIndex] = useState(0);

  useEffect(() => {
    if (!isLoading && user) {
      navigate(getDefaultRouteForRole(user.role));
    }
  }, [isLoading, navigate, user]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setPhraseIndex((current) => (current + 1) % rotatingPhrases.length);
    }, 2200);

    return () => window.clearInterval(timer);
  }, []);

  const phrase = useMemo(() => rotatingPhrases[phraseIndex], [phraseIndex]);

  return (
    <MarketingShell>
      <section className="grid gap-14 pb-20 pt-8 lg:grid-cols-[1.02fr_0.98fr] lg:items-center">
        <ScrollReveal className="max-w-3xl">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.34em] text-primary">
            {/* Bright parallel flow */}
          </p>
          <h1 className="max-w-3xl text-5xl font-semibold tracking-tight text-slate-950 sm:text-6xl">
            Campus passes, refined in white, black, and blue.
          </h1>

          <div className="brand-panel mt-6 inline-flex min-h-14 items-center rounded-full border px-5 py-3 backdrop-blur-xl">
            <span className="brand-mark mr-3 inline-flex h-8 w-8 items-center justify-center rounded-full text-white">
              <Sparkles className="h-4 w-4" />
            </span>
            <span key={phrase} className="text-base font-medium text-slate-800">
              {phrase}
            </span>
          </div>

          <p className="mt-6 max-w-xl text-base leading-7 text-slate-600">
            Request, approve, and scan in one smooth system.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button
              asChild
              size="lg"
              className="brand-cta rounded-full border-0 px-7"
            >
              <Link href="/login">
                Start student access
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="rounded-full border-white/80 bg-white/70 px-7 text-slate-900 hover:bg-white"
            >
              <Link href="/staff-join">Staff access</Link>
            </Button>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {[
              ['Fast requests', 'Students move quickly'],
              ['Live approvals', 'Staff stays in sync'],
              ['QR gate flow', 'Security checks instantly'],
            ].map(([title, copy], index) => (
              <ScrollReveal key={title} delay={index * 120}>
                <Card className="brand-panel border">
                  <CardContent className="p-5">
                    <p className="text-lg font-semibold text-slate-950">{title}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-500">{copy}</p>
                  </CardContent>
                </Card>
              </ScrollReveal>
            ))}
          </div>
        </ScrollReveal>

        <ScrollReveal delay={120} className="relative">
          <div className="brand-panel relative rounded-[2.25rem] border p-6 backdrop-blur-xl">
            <div className="flex items-center justify-between border-b border-blue-100/80 pb-4">
              <div>
                <p className="text-sm font-medium text-slate-500">Parallel surface</p>
                <p className="text-xl font-semibold text-slate-950">One lane per role</p>
              </div>
              <span className="brand-pill rounded-full px-3 py-1 text-xs font-semibold">
                Blue core
              </span>
            </div>

            <div className="mt-6 grid gap-4">
              {floatingCards.map((card, index) => (
                <div
                  key={card.title}
                  className={`brand-panel-soft rounded-[1.75rem] border p-5 ${
                    index % 2 === 0 ? 'float-orbit' : 'float-orbit-alt'
                  }`}
                  style={{ animationDelay: `${index * 0.5}s` }}
                >
                  <div className={`inline-flex rounded-full bg-gradient-to-r ${card.tone} px-3 py-1 text-xs font-semibold text-white`}>
                    Lane 0{index + 1}
                  </div>
                  <h2 className="mt-4 text-xl font-semibold text-slate-950">{card.title}</h2>
                  <p className="mt-2 text-sm text-slate-500">{card.label}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="brand-panel-soft rounded-[1.5rem] border p-4">
                <BadgeCheck className="h-5 w-5 text-primary" />
                <p className="mt-3 text-sm font-medium text-slate-950">Clear approvals</p>
              </div>
              <div className="brand-panel-soft rounded-[1.5rem] border p-4">
                <ScanLine className="h-5 w-5 text-secondary" />
                <p className="mt-3 text-sm font-medium text-slate-950">Smooth scans</p>
              </div>
            </div>
          </div>

        </ScrollReveal>
      </section>

      <section className="grid gap-5 border-y border-blue-100/70 py-16 lg:grid-cols-3">
        {[
          {
            icon: Layers3,
            title: 'Parallel by design',
            copy: 'Students, admins, and security stay aligned without waiting on paper.',
            tone: 'from-blue-100 to-white',
          },
          {
            icon: Zap,
            title: 'Cleaner experience',
            copy: 'Fast actions, sharper contrast, and a calmer visual flow everywhere.',
            tone: 'from-slate-100 to-white',
          },
          {
            icon: BadgeCheck,
            title: 'Modern control',
            copy: 'Everything stays logged, verifiable, and easy to understand.',
            tone: 'from-blue-50 to-white',
          },
        ].map((item, index) => (
          <ScrollReveal key={item.title} delay={index * 110}>
            <div className={`rounded-[1.8rem] border border-blue-100/80 bg-gradient-to-br ${item.tone} p-6`}>
              <item.icon className="h-5 w-5 text-slate-900" />
              <h3 className="mt-4 text-xl font-semibold text-slate-950">{item.title}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">{item.copy}</p>
            </div>
          </ScrollReveal>
        ))}
      </section>

      <section className="grid gap-6 py-16 lg:grid-cols-[0.85fr_1.15fr]">
        <ScrollReveal>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">Quick links</p>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">
            Less reading. Faster next move.
          </h2>
        </ScrollReveal>

        <div className="grid gap-4 sm:grid-cols-2">
          {[
            ['About', 'See what ExitPass is for.'],
            ['FAQs', 'Get the short answers fast.'],
            ['Help', 'Find support when something slips.'],
            ['Forgot password', 'Reset access in minutes.'],
          ].map(([title, copy], index) => (
            <ScrollReveal key={title} delay={index * 100}>
              <Card className="brand-panel border">
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold text-slate-950">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-500">{copy}</p>
                  <Button asChild variant="ghost" className="mt-4 h-auto px-0 text-slate-950 hover:bg-transparent">
                    <Link
                      href={`/${
                        title.toLowerCase().replace(/\s+/g, '-') === 'forgot-password'
                          ? 'forgot-password'
                          : title.toLowerCase()
                      }`}
                    >
                      Open
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </ScrollReveal>
          ))}
        </div>
      </section>
    </MarketingShell>
  );
}
