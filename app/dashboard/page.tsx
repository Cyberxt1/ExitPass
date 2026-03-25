'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  Bell,
  CheckCircle2,
  Clock3,
  Plus,
  QrCode,
  ScanLine,
} from 'lucide-react';

import { DashboardShell } from '@/components/dashboard-shell';
import {
  EmptyState,
  LoadingPanel,
  MetricCard,
  PageHero,
  SectionCard,
  StatusBadge,
} from '@/components/platform-ui';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';
import { apiService } from '@/lib/api-service';
import { countPassesByStatus, formatDateTime, getPassStatusMeta } from '@/lib/platform';
import type { Announcement, Pass } from '@/lib/types';

export default function DashboardPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [activePasses, setActivePasses] = useState<Pass[]>([]);
  const [passHistory, setPassHistory] = useState<Pass[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    if (!isLoading && user?.role !== 'student') {
      router.push('/admin-dashboard');
    }
  }, [isLoading, router, user?.role]);

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    void loadData();
  }, [user?.id]);

  const loadData = async () => {
    setDataLoading(true);
    setLoadError('');

    try {
      const [allPasses, activeStudentPasses, studentAnnouncements] = await Promise.all([
        apiService.getStudentPasses(user!.id),
        apiService.getActiveStudentPasses(user!.id),
        apiService.getAnnouncements(user!.role),
      ]);

      setPassHistory(allPasses);
      setActivePasses(activeStudentPasses);
      setAnnouncements(studentAnnouncements.slice(0, 4));
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Unable to load your dashboard right now.');
    } finally {
      setDataLoading(false);
    }
  };

  const studentMeta = [user?.matric, user?.hostel, user?.room ? `Room ${user.room}` : null]
    .filter(Boolean)
    .join(' • ');

  const openRequests = useMemo(
    () =>
      passHistory.filter((pass) =>
        ['pending', 'chaplaincy_required'].includes(pass.status),
      ).length,
    [passHistory],
  );

  const approvedPasses = useMemo(
    () => countPassesByStatus(passHistory, 'approved'),
    [passHistory],
  );

  const latestPass = passHistory[0] ?? null;

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  if (user?.role !== 'student') {
    return null;
  }

  return (
    <DashboardShell title="Student Dashboard" contentClassName="mx-auto max-w-7xl">
      <div className="space-y-6">
        <PageHero
          eyebrow="Student lane"
          title={`Welcome back, ${user.name}`}
          description={
            studentMeta
              ? `${studentMeta}. Request a pass, track each approval stage, and keep your QR ready before you get to the gate.`
              : 'Request a pass, track each approval stage, and keep your QR ready before you get to the gate.'
          }
          actions={
            <>
              <Button
                onClick={() => router.push('/dashboard/request')}
                className="rounded-full border-0 bg-[linear-gradient(135deg,#ff7a18,#ff477e)] text-white hover:opacity-95"
              >
                <Plus className="mr-2 h-4 w-4" />
                New request
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push('/dashboard/passes')}
                className="rounded-full border-white/80 bg-white/80 text-slate-900 hover:bg-white"
              >
                <QrCode className="mr-2 h-4 w-4" />
                View passes
              </Button>
            </>
          }
        >
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Active now"
              value={activePasses.length}
              description="Passes currently valid for movement."
              icon={ScanLine}
            />
            <MetricCard
              label="Open requests"
              value={openRequests}
              description="Requests still waiting on approval."
              icon={Clock3}
              accentClassName="bg-[linear-gradient(135deg,rgba(255,196,87,0.22),rgba(255,255,255,0.88))]"
            />
            <MetricCard
              label="Approved"
              value={approvedPasses}
              description="Passes cleared for use so far."
              icon={CheckCircle2}
              accentClassName="bg-[linear-gradient(135deg,rgba(51,200,143,0.22),rgba(255,255,255,0.88))]"
            />
            <MetricCard
              label="History"
              value={passHistory.length}
              description="Every request and pass record in one place."
              icon={Bell}
              accentClassName="bg-[linear-gradient(135deg,rgba(89,179,255,0.22),rgba(255,255,255,0.88))]"
            />
          </div>
        </PageHero>

        {dataLoading ? (
          <LoadingPanel label="Loading your dashboard..." />
        ) : loadError ? (
          <EmptyState
            title="Dashboard data is unavailable"
            description={loadError}
            action={
              <Button onClick={() => void loadData()} className="rounded-full bg-slate-950 text-white hover:bg-slate-800">
                Try again
              </Button>
            }
          />
        ) : (
          <>
            <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
              <SectionCard
                title="Pass spotlight"
                description="Your most important pass details stay ready at a glance."
              >
                {activePasses[0] ? (
                  <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                    <div className="rounded-[1.75rem] border border-white/70 bg-[linear-gradient(135deg,rgba(255,122,24,0.12),rgba(89,179,255,0.08),rgba(255,255,255,0.96))] p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                            Destination
                          </p>
                          <h2 className="mt-3 text-2xl font-semibold text-slate-950">
                            {activePasses[0].destination}
                          </h2>
                        </div>
                        <StatusBadge
                          label={getPassStatusMeta(activePasses[0]).label}
                          tone={`${getPassStatusMeta(activePasses[0]).surface} ${getPassStatusMeta(activePasses[0]).tone}`}
                        />
                      </div>
                      <p className="mt-4 text-sm leading-7 text-slate-600">{activePasses[0].reason}</p>
                      <div className="mt-5 flex flex-wrap gap-3">
                        <Button
                          onClick={() => router.push('/dashboard/passes')}
                          className="rounded-full bg-slate-950 text-white hover:bg-slate-800"
                        >
                          Open pass wallet
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                      <div className="rounded-[1.5rem] border border-white/70 bg-slate-50/90 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                          Departure
                        </p>
                        <p className="mt-2 text-sm leading-6 text-slate-900">
                          {formatDateTime(activePasses[0].departureDate)}
                        </p>
                      </div>
                      <div className="rounded-[1.5rem] border border-white/70 bg-slate-50/90 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                          Expected return
                        </p>
                        <p className="mt-2 text-sm leading-6 text-slate-900">
                          {formatDateTime(activePasses[0].expectedReturnDate)}
                        </p>
                      </div>
                      <div className="rounded-[1.5rem] border border-white/70 bg-slate-50/90 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                          QR readiness
                        </p>
                        <p className="mt-2 text-sm leading-6 text-slate-900">
                          {activePasses[0].qrCode
                            ? 'Your QR code is generated and ready for security verification.'
                            : 'QR code will appear once the pass is approved.'}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : latestPass ? (
                  <div className="rounded-[1.75rem] border border-white/70 bg-slate-50/90 p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                          Latest request
                        </p>
                        <h2 className="mt-2 text-2xl font-semibold text-slate-950">
                          {latestPass.destination}
                        </h2>
                      </div>
                      <StatusBadge
                        label={getPassStatusMeta(latestPass).label}
                        tone={`${getPassStatusMeta(latestPass).surface} ${getPassStatusMeta(latestPass).tone}`}
                      />
                    </div>
                    <p className="mt-4 text-sm leading-7 text-slate-600">{latestPass.reason}</p>
                  </div>
                ) : (
                  <EmptyState
                    title="No passes yet"
                    description="Your first request will appear here with live progress through chaplaincy, hall admin review, and gate readiness."
                    action={
                      <Button
                        onClick={() => router.push('/dashboard/request')}
                        className="rounded-full bg-slate-950 text-white hover:bg-slate-800"
                      >
                        Start first request
                      </Button>
                    }
                  />
                )}
              </SectionCard>

              <SectionCard
                title="Announcements"
                description="Important updates from staff stay visible here."
              >
                {announcements.length ? (
                  <div className="space-y-3">
                    {announcements.map((announcement) => (
                      <div
                        key={announcement.id}
                        className="rounded-[1.5rem] border border-white/70 bg-slate-50/90 p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-slate-950">{announcement.title}</p>
                            <p className="mt-2 text-sm leading-6 text-slate-600">
                              {announcement.message}
                            </p>
                          </div>
                        </div>
                        <p className="mt-3 text-xs uppercase tracking-[0.2em] text-slate-400">
                          {formatDateTime(announcement.createdAt)}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50/80 p-5 text-sm leading-7 text-slate-600">
                    There are no announcements for you right now.
                  </div>
                )}
              </SectionCard>
            </div>

            <SectionCard
              title="Recent activity"
              description="Every pass request and final pass record stays visible with its current stage."
              action={
                <Button
                  variant="outline"
                  onClick={() => router.push('/dashboard/passes')}
                  className="rounded-full border-white/80 bg-white/80 text-slate-900 hover:bg-white"
                >
                  Full history
                </Button>
              }
            >
              {passHistory.length ? (
                <div className="space-y-3">
                  {passHistory.slice(0, 6).map((pass) => {
                    const status = getPassStatusMeta(pass);

                    return (
                      <button
                        key={pass.id}
                        type="button"
                        onClick={() => router.push('/dashboard/passes')}
                        className="flex w-full flex-col gap-4 rounded-[1.5rem] border border-white/70 bg-slate-50/90 p-4 text-left transition hover:border-slate-300 hover:bg-white sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div>
                          <p className="text-lg font-semibold text-slate-950">{pass.destination}</p>
                          <p className="mt-1 text-sm text-slate-500">{pass.reason}</p>
                          <p className="mt-2 text-xs uppercase tracking-[0.2em] text-slate-400">
                            {formatDateTime(pass.createdAt)}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                          <StatusBadge
                            label={status.label}
                            tone={`${status.surface} ${status.tone}`}
                          />
                          <span className="text-sm text-slate-500">
                            {formatDateTime(pass.expectedReturnDate)}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <EmptyState
                  title="No activity yet"
                  description="Once you submit a pass request, its progress will show up here immediately."
                />
              )}
            </SectionCard>
          </>
        )}
      </div>
    </DashboardShell>
  );
}
