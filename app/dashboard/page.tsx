'use client';

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { NotificationCenter } from '@/components/notification-center';
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
import { getDefaultRouteForRole } from '@/lib/firebase/auth';
import { countPassesByStatus, formatDateTime, getPassStatusMeta } from '@/lib/platform';
import type { Announcement, Notification, Pass } from '@/lib/types';

export default function DashboardPage() {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const [activePasses, setActivePasses] = useState<Pass[]>([]);
  const [passHistory, setPassHistory] = useState<Pass[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    if (!isLoading && user?.role !== 'student') {
      navigate(getDefaultRouteForRole(user?.role));
    }
  }, [isLoading, navigate, user?.role]);

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
      const [allPasses, activeStudentPasses, studentAnnouncements, studentNotifications] = await Promise.all([
        apiService.getStudentPasses(user!.id),
        apiService.getActiveStudentPasses(user!.id),
        apiService.getAnnouncements(user!.role),
        apiService.getUserNotifications(user!.id),
      ]);

      setPassHistory(allPasses);
      setActivePasses(activeStudentPasses);
      setAnnouncements(studentAnnouncements.slice(0, 4));
      setNotifications(studentNotifications.slice(0, 4));
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Unable to load your dashboard right now.');
    } finally {
      setDataLoading(false);
    }
  };

  const studentMeta = [user?.hostel, user?.room ? `Room ${user.room}` : null]
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
          eyebrow="Student"
          title={`Welcome, ${user.name}, ${user?.matric}`}
          description={
            studentMeta
              ? `${studentMeta}.`
              : 'Create requests, check status, and open your QR pass here.'
          }
          actions={
            <>
              <Button onClick={() => navigate('/dashboard/request')} className="brand-cta rounded-full border-0">
                <Plus className="mr-2 h-4 w-4" />
                New request
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate('/dashboard/passes')}
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
              icon={ScanLine}
            />
            <MetricCard
              label="Open requests"
              value={openRequests}
              icon={Clock3}
              accentClassName="brand-icon-chip"
            />
            <MetricCard
              label="Approved"
              value={approvedPasses}
              icon={CheckCircle2}
              accentClassName="brand-icon-chip"
            />
            <MetricCard
              label="Alerts"
              value={notifications.length}
              icon={Bell}
              accentClassName="brand-icon-chip"
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
                title="Passes"
                description="Your current pass or latest request."
              >
                {activePasses[0] ? (
                  <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                    <div className="brand-panel-soft rounded-[1.75rem] border p-5">
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
                          onClick={() => navigate('/dashboard/passes')}
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
                          Pass ID status
                        </p>
                        <p className="mt-2 text-sm leading-6 text-slate-900">
                          {activePasses[0].qrCode
                            ? 'Ready for gate verification.'
                            : 'Available after approval.'}
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
                    description="Your first request will appear here."
                    action={
                      <Button
                        onClick={() => navigate('/dashboard/request')}
                        className="rounded-full bg-slate-950 text-white hover:bg-slate-800"
                      >
                        Start first request
                      </Button>
                    }
                  />
                )}
              </SectionCard>

              <div className="space-y-4">
                <SectionCard
                  title="Notifications"
                >
                  <NotificationCenter notifications={notifications} className="h-72" />
                </SectionCard>

                <SectionCard
                  title="Announcements"
                  description="Latest updates."
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
            </div>

            <SectionCard
              title="Recent activity"
              description="Recent requests and pass records."
              action={
                <Button
                  variant="outline"
                  onClick={() => navigate('/dashboard/passes')}
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
                        onClick={() => navigate('/dashboard/passes')}
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
                  description="Your requests will appear here."
                />
              )}
            </SectionCard>
          </>
        )}
      </div>
    </DashboardShell>
  );
}
