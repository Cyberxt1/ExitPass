'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowRight } from 'lucide-react';

import { useAuth } from '@/lib/auth-context';
import { getDefaultRouteForRole } from '@/lib/firebase/auth';
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
  const pathname = usePathname();
  const { user } = useAuth();

  return (
    <div className="min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_top_left,_rgba(255,134,85,0.32),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(86,181,255,0.28),_transparent_34%),linear-gradient(180deg,_#fff7ea_0%,_#fffdf8_42%,_#eef9ff_100%)] text-slate-950">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="glow-shift absolute left-[-7rem] top-20 h-56 w-56 rounded-full bg-primary/25 blur-3xl" />
        <div className="glow-shift absolute right-[-8rem] top-24 h-72 w-72 rounded-full bg-secondary/20 blur-3xl" />
        <div className="glow-shift absolute left-1/3 top-[32rem] h-64 w-64 rounded-full bg-accent/18 blur-3xl" />
        <div className="absolute inset-x-[-10%] top-20 h-px rotate-[8deg] bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
        <div className="absolute inset-x-[-8%] top-44 h-px rotate-[8deg] bg-gradient-to-r from-transparent via-secondary/55 to-transparent" />
        <div className="absolute inset-x-[-6%] top-72 h-px rotate-[8deg] bg-gradient-to-r from-transparent via-accent/55 to-transparent" />
      </div>

      <div className="relative">
        <header className="sticky top-0 z-30 border-b border-white/40 bg-white/55 backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
            <Link href="/" className="flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#ff7a18,#ff477e)] text-sm font-semibold text-white shadow-[0_20px_40px_-20px_rgba(255,71,126,0.8)]">
                EP
              </span>
              <div>
                <p className="text-sm font-semibold tracking-[0.24em] text-slate-700 uppercase">
                  ExitPass
                </p>
                <p className="text-xs text-slate-500">Bright parallel movement</p>
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
                  className="rounded-full border-0 bg-[linear-gradient(135deg,#111827,#334155)] text-white hover:opacity-95"
                >
                  <Link href={getDefaultRouteForRole(user.role)}>
                    Dashboard
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              ) : (
                <>
                  <Button asChild variant="ghost" className="rounded-full text-slate-700 hover:text-slate-950">
                    <Link href="/login">Log in</Link>
                  </Button>
                  <Button
                    asChild
                    className="rounded-full border-0 bg-[linear-gradient(135deg,#ff7a18,#ff477e)] text-white hover:opacity-95"
                  >
                    <Link href="/signup">Sign up</Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        </header>

        <main className={cn('mx-auto max-w-7xl px-4 sm:px-6 lg:px-8', compact ? 'py-16' : 'py-10')}>
          {children}
        </main>

        <footer className="border-t border-white/40 bg-white/50 backdrop-blur-xl">
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
