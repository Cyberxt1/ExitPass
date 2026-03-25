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

  return (
    <div className="brand-dashboard-shell min-h-screen overflow-x-hidden">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="brand-glow-primary absolute left-[-5rem] top-28 h-56 w-56 rounded-full blur-3xl" />
        <div className="brand-glow-secondary absolute right-[-7rem] top-16 h-72 w-72 rounded-full blur-3xl" />
        <div className="brand-line absolute inset-x-[-8%] top-24 h-px rotate-[7deg]" />
      </div>
      <DashboardHeader title={title} />

      <div className="relative mx-auto flex w-full max-w-[1800px] gap-0 px-0 lg:gap-6 lg:px-4 xl:px-6">
        <aside className="hidden lg:block lg:w-72 lg:shrink-0">
          <div className="brand-panel sticky top-24 h-[calc(100vh-7rem)] overflow-hidden rounded-[2rem] border backdrop-blur-xl">
            <div className="h-full overflow-y-auto">
              <NavSidebar />
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <div className={cn('p-4 pb-24 sm:p-6 lg:py-8', contentClassName)}>{children}</div>
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
              <div className="flex items-center justify-between border-b border-blue-100/80 px-4 py-3">
                <p className="text-sm font-semibold text-slate-900">Navigation</p>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-full"
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
          className="brand-panel fixed bottom-5 right-5 z-40 h-14 w-14 rounded-full border text-slate-950 backdrop-blur-xl hover:bg-white"
          onClick={() => setSidebarOpen((current) => !current)}
        >
          {sidebarOpen ? <PanelLeftClose className="h-5 w-5" /> : <PanelLeftOpen className="h-5 w-5" />}
        </Button>
      </div>
    </div>
  );
}
