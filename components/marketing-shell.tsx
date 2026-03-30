'use client';

import { useLocation } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

import { useAuth } from '@/lib/auth-context';
import { getDefaultRouteForRole } from '@/lib/firebase/auth';
import { Link } from '@/components/app-link';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const marketingLinks = [
  { href: '/', label: 'Overview' },
  { href: '/about', label: 'About' },
  { href: '/faqs', label: 'FAQs' },
  { href: '/help', label: 'Help' },
];

export function MarketingShell({
  children,
  compact = false,
}: {
  children: React.ReactNode;
  compact?: boolean;
}) {
  const { pathname } = useLocation();
  const { user } = useAuth();

  return (
    <div className="brand-shell min-h-screen overflow-x-hidden text-slate-950">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="brand-glow-primary glow-shift absolute left-[-7rem] top-20 h-56 w-56 rounded-full blur-3xl" />
        <div className="brand-glow-secondary glow-shift absolute right-[-8rem] top-24 h-72 w-72 rounded-full blur-3xl" />
        <div className="brand-glow-primary glow-shift absolute left-1/3 top-[32rem] h-64 w-64 rounded-full blur-3xl" />
        <div className="brand-line absolute inset-x-[-10%] top-20 h-px rotate-[8deg]" />
        <div className="brand-line absolute inset-x-[-8%] top-44 h-px rotate-[8deg] opacity-75" />
        <div className="brand-line absolute inset-x-[-6%] top-72 h-px rotate-[8deg] opacity-55" />
      </div>

      <div className="relative">
        <header className="sticky top-0 z-30 border-b border-blue-100/70 bg-white/80 backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
            <Link href="/" className="flex items-center gap-3">
              <span className="brand-mark inline-flex h-10 w-10 items-center justify-center rounded-2xl text-sm font-semibold text-white">
                EP
              </span>
              <div>
                <p className="text-sm font-semibold tracking-[0.24em] text-slate-700 uppercase">
                  ExitPass
                </p>
                <p className="text-xs text-slate-500">White, black, and blue clarity</p>
              </div>
            </Link>

            <nav className="hidden items-center gap-6 md:flex">
              {marketingLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    'text-sm transition-colors',
                    pathname === link.href ? 'text-slate-950' : 'text-slate-500 hover:text-slate-950',
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            <div className="flex items-center gap-2">
              {user ? (
                <Button
                  asChild
                  className="brand-cta rounded-full border-0"
                >
                  <Link href={getDefaultRouteForRole(user.role)}>
                    Dashboard
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              ) : (
                <Button asChild className="brand-cta rounded-full border-0">
                  <Link href="/login">Student access</Link>
                </Button>
              )}
            </div>
          </div>
        </header>

        <main className={cn('mx-auto max-w-7xl px-4 sm:px-6 lg:px-8', compact ? 'py-16' : 'py-10')}>
          {children}
        </main>

        <footer className="border-t border-blue-100/70 bg-white/72 backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 text-sm text-slate-600 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
            <p>ExitPass keeps student movement bright, fast, and traceable.</p>
            <div className="flex flex-wrap gap-4">
              <Link href="/about" className="hover:text-slate-950">About</Link>
              <Link href="/faqs" className="hover:text-slate-950">FAQs</Link>
              <Link href="/help" className="hover:text-slate-950">Help</Link>
              <Link href="/forgot-password" className="hover:text-slate-950">Forgot password</Link>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
