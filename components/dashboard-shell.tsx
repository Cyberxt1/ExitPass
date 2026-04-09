'use client';

import { useState } from 'react';
import { PanelLeftClose, PanelLeftOpen, X } from 'lucide-react';

import { DashboardHeader } from '@/components/dashboard-header';
import { NavSidebar } from '@/components/nav-sidebar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface DashboardShellProps {
  title: string;
  children: React.ReactNode;
  contentClassName?: string;
}

export function DashboardShell({
  title,
  children,
  contentClassName,
}: DashboardShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const desktopSidebarLeft = 'max(1rem, calc((100vw - 1800px) / 2 + 1rem))';

  return (
    <div className="brand-dashboard-shell min-h-screen overflow-x-hidden">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="brand-glow-primary absolute left-[-5rem] top-28 h-56 w-56 rounded-full blur-3xl" />
        <div className="brand-glow-secondary absolute right-[-7rem] top-16 h-72 w-72 rounded-full blur-3xl" />
        <div className="brand-line absolute inset-x-[-8%] top-24 h-px rotate-[7deg]" />
      </div>
      <DashboardHeader title={title} />
      <div aria-hidden className="hidden h-[4.5rem] lg:block" />

      <div className="relative mx-auto w-full max-w-[1800px] px-0 lg:px-3 xl:px-4">
        <aside className="hidden lg:block">
          <div
            className="brand-panel fixed top-24 z-30 h-[calc(100vh-7rem)] w-72 overflow-hidden rounded-[2rem] border backdrop-blur-xl"
            style={{ left: desktopSidebarLeft }}
          >
            <div className="h-full overflow-y-auto">
              <NavSidebar />
            </div>
          </div>
        </aside>

        <main className="min-w-0 lg:pl-[19rem] xl:pl-[19.5rem]">
          <div className={cn('p-2 pb-[4.5rem] sm:p-2.5 lg:py-4', contentClassName)}>{children}</div>
        </main>
      </div>

      <div className="lg:hidden">
        {sidebarOpen && (
          <>
            <button
              type="button"
              aria-label="Close sidebar overlay"
              className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-[2px]"
              onClick={() => setSidebarOpen(false)}
            />
            <aside className="brand-panel fixed inset-y-4 left-4 right-12 z-50 max-w-sm overflow-hidden rounded-[2rem] border backdrop-blur-xl">
              <div className="flex items-center justify-between border-b border-blue-100/80 px-4 py-3 dark:border-white/10">
                <p className="text-sm font-semibold text-slate-900 dark:text-[#eef5ff]">Navigation</p>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-full dark:text-[#d7e7fb]"
                  onClick={() => setSidebarOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="h-[calc(100%-4rem)] overflow-y-auto">
                <NavSidebar onItemClick={() => setSidebarOpen(false)} />
              </div>
            </aside>
          </>
        )}

        <Button
          type="button"
          size="icon"
          className="brand-panel fixed bottom-5 right-5 z-40 h-14 w-14 rounded-full border text-slate-950 backdrop-blur-xl hover:bg-white dark:text-[#eef5ff] dark:hover:bg-white/10"
          onClick={() => setSidebarOpen((current) => !current)}
        >
          {sidebarOpen ? <PanelLeftClose className="h-5 w-5" /> : <PanelLeftOpen className="h-5 w-5" />}
        </Button>
      </div>
    </div>
  );
}
