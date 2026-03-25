'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Copy,
  Download,
  Eye,
  QrCode,
  XCircle,
} from 'lucide-react';

import { DashboardShell } from '@/components/dashboard-shell';
import {
  DetailBlock,
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
import {
  countPassesByStatus,
  formatDate,
  formatDateTime,
  formatDurationDays,
  getPassStatusMeta,
  getPassTypeLabel,
  isPassCurrentlyActive,
} from '@/lib/platform';
import type { Pass } from '@/lib/types';

type FilterId = 'all' | 'approved' | 'open' | 'rejected';

const filters: Array<{ id: FilterId; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'approved', label: 'Approved' },
  { id: 'open', label: 'In progress' },
  { id: 'rejected', label: 'Rejected' },
];

export default function PassesPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [passes, setPasses] = useState<Pass[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [selectedPass, setSelectedPass] = useState<Pass | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterId>('all');
  const [loadError, setLoadError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [isLoading, router, user]);

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    void loadPasses();
  }, [user?.id]);

  const loadPasses = async () => {
    setDataLoading(true);
    setLoadError('');

    try {
      const data = await apiService.getStudentPasses(user!.id);
      setPasses(data);
      setSelectedPass((current) => current ? data.find((pass) => pass.id === current.id) || current : null);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Unable to load your passes.');
    } finally {
      setDataLoading(false);
    }
  };

  const filteredPasses = useMemo(() => {
    switch (activeFilter) {
      case 'approved':
        return passes.filter((pass) => pass.status === 'approved');
      case 'open':
        return passes.filter((pass) => ['pending', 'chaplaincy_required'].includes(pass.status));
      case 'rejected':
        return passes.filter((pass) => pass.status === 'rejected');
      default:
        return passes;
    }
  }, [activeFilter, passes]);

  const activeCount = useMemo(
    () => passes.filter((pass) => isPassCurrentlyActive(pass)).length,
    [passes],
  );

  const latestApprovedPass = useMemo(
    () => passes.find((pass) => pass.status === 'approved'),
    [passes],
  );

  const copyQrCode = async () => {
    if (!selectedPass?.qrCode) {
      return;
    }

    await navigator.clipboard.writeText(selectedPass.qrCode);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  };

  const downloadPass = () => {
    window.print();
  };

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  return (
    <DashboardShell title="My Passes" contentClassName="mx-auto max-w-7xl">
      <div className="space-y-6">
        {selectedPass ? (
          <>
            <PageHero
              eyebrow="Pass detail"
              title={selectedPass.destination}
              description="This view keeps the certificate, approval state, and timing in one place for easy inspection."
              actions={
                <Button
                  variant="outline"
                  onClick={() => setSelectedPass(null)}
                  className="rounded-full border-white/80 bg-white/80 text-slate-900 hover:bg-white"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to all passes
                </Button>
              }
            />

            <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
              <SectionCard
                title={getPassTypeLabel(selectedPass.type)}
                description="Your digital pass stays readable, printable, and ready to verify."
              >
                <div className="space-y-5">
                  <div className="rounded-[2rem] border border-white/80 bg-[linear-gradient(135deg,rgba(255,122,24,0.12),rgba(89,179,255,0.1),rgba(255,255,255,0.97))] p-6">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                          ExitPass certificate
                        </p>
                        <h2 className="mt-3 text-3xl font-semibold text-slate-950">
                          {selectedPass.destination}
                        </h2>
                      </div>
                      <StatusBadge
                        label={getPassStatusMeta(selectedPass).label}
                        tone={`${getPassStatusMeta(selectedPass).surface} ${getPassStatusMeta(selectedPass).tone}`}
                      />
                    </div>

                    <div className="mt-8 flex justify-center">
                      <div className="rounded-[1.75rem] border border-white/90 bg-white p-6 shadow-[0_26px_70px_-45px_rgba(15,23,42,0.55)]">
                        <div className="flex h-56 w-56 flex-col items-center justify-center rounded-[1.25rem] border border-dashed border-slate-200 bg-slate-50">
                          <QrCode className="h-28 w-28 text-slate-900" />
                          <p className="mt-4 max-w-[12rem] text-center text-xs font-medium tracking-[0.18em] text-slate-500">
                            {selectedPass.qrCode || 'QR code appears after approval'}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 grid gap-4 sm:grid-cols-2">
                      <DetailBlock label="Reason" value={selectedPass.reason} />
                      <DetailBlock label="Issued" value={formatDateTime(selectedPass.createdAt)} />
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <Button
                      onClick={downloadPass}
                      disabled={!selectedPass.qrCode}
                      className="h-12 flex-1 rounded-full bg-slate-950 text-white hover:bg-slate-800"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Print or save pass
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => void copyQrCode()}
                      disabled={!selectedPass.qrCode}
                      className="h-12 rounded-full border-white/80 bg-white/80 text-slate-900 hover:bg-white"
                    >
                      <Copy className="mr-2 h-4 w-4" />
                      {copied ? 'Copied' : 'Copy QR'}
                    </Button>
                  </div>
                </div>
              </SectionCard>

              <div className="space-y-6">
                <SectionCard
                  title="Pass facts"
                  description="Everything security and staff need to verify the record."
                >
                  <div className="grid gap-3">
                    <DetailBlock label="Departure" value={formatDateTime(selectedPass.departureDate)} />
                    <DetailBlock label="Return" value={formatDateTime(selectedPass.expectedReturnDate)} />
                    <DetailBlock label="Duration" value={formatDurationDays(selectedPass.departureDate, selectedPass.expectedReturnDate)} />
                    <DetailBlock label="Stage" value={getPassStatusMeta(selectedPass).label} />
                  </div>
                </SectionCard>

                <SectionCard
                  title="Approval trail"
                  description="A quick view of how the request moved through review."
                >
                  <div className="space-y-3">
                    <div className="rounded-[1.25rem] border border-white/70 bg-slate-50/90 p-4">
                      <p className="font-semibold text-slate-950">Chaplaincy</p>
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        {selectedPass.chaplainApproval?.status === 'approved'
                          ? `Approved ${formatDateTime(selectedPass.chaplainApproval.approvedAt)}.`
                          : selectedPass.chaplainApproval?.status === 'rejected'
                            ? `Rejected ${formatDateTime(selectedPass.chaplainApproval.approvedAt)}.`
                            : 'Waiting for chaplaincy review.'}
                      </p>
                    </div>
                    <div className="rounded-[1.25rem] border border-white/70 bg-slate-50/90 p-4">
                      <p className="font-semibold text-slate-950">Hall admin</p>
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        {selectedPass.hallAdminApproval?.status === 'approved'
                          ? `Approved ${formatDateTime(selectedPass.hallAdminApproval.approvedAt)}.`
                          : selectedPass.hallAdminApproval?.status === 'rejected'
                            ? `Rejected ${formatDateTime(selectedPass.hallAdminApproval.approvedAt)}.`
                            : 'Waiting for hall admin review.'}
                      </p>
                    </div>
                  </div>
                </SectionCard>
              </div>
            </div>
          </>
        ) : (
          <>
            <PageHero
              eyebrow="Pass wallet"
              title="Track every pass in one place"
              description="See what is approved, what is still moving through review, and what is ready to print for the gate."
              actions={
                <Button
                  onClick={() => router.push('/dashboard/request')}
                  className="rounded-full bg-[linear-gradient(135deg,#ff7a18,#ff477e)] text-white hover:opacity-95"
                >
                  Request another pass
                </Button>
              }
            >
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard
                  label="All passes"
                  value={passes.length}
                  description="Every pass and request record."
                  icon={QrCode}
                />
                <MetricCard
                  label="Active now"
                  value={activeCount}
                  description="Approved and currently valid."
                  icon={CheckCircle2}
                  accentClassName="bg-[linear-gradient(135deg,rgba(51,200,143,0.22),rgba(255,255,255,0.88))]"
                />
                <MetricCard
                  label="In progress"
                  value={passes.filter((pass) => ['pending', 'chaplaincy_required'].includes(pass.status)).length}
                  description="Still waiting on staff review."
                  icon={Clock3}
                  accentClassName="bg-[linear-gradient(135deg,rgba(255,196,87,0.22),rgba(255,255,255,0.88))]"
                />
                <MetricCard
                  label="Rejected"
                  value={countPassesByStatus(passes, 'rejected')}
                  description="Requests that need a new submission."
                  icon={XCircle}
                  accentClassName="bg-[linear-gradient(135deg,rgba(244,114,182,0.18),rgba(255,255,255,0.88))]"
                />
              </div>
            </PageHero>

            {dataLoading ? (
              <LoadingPanel label="Loading your pass wallet..." />
            ) : loadError ? (
              <EmptyState
                title="Passes are unavailable"
                description={loadError}
                action={
                  <Button onClick={() => void loadPasses()} className="rounded-full bg-slate-950 text-white hover:bg-slate-800">
                    Try again
                  </Button>
                }
              />
            ) : passes.length ? (
              <div className="grid gap-6 xl:grid-cols-[0.82fr_1.18fr]">
                <SectionCard
                  title="Latest approved pass"
                  description="Keep your most useful pass at the top of your wallet."
                >
                  {latestApprovedPass ? (
                    <button
                      type="button"
                      onClick={() => setSelectedPass(latestApprovedPass)}
                      className="w-full rounded-[1.75rem] border border-white/70 bg-[linear-gradient(135deg,rgba(255,122,24,0.12),rgba(89,179,255,0.08),rgba(255,255,255,0.96))] p-5 text-left transition hover:border-slate-300"
                    >
                      <StatusBadge
                        label={getPassStatusMeta(latestApprovedPass).label}
                        tone={`${getPassStatusMeta(latestApprovedPass).surface} ${getPassStatusMeta(latestApprovedPass).tone}`}
                      />
                      <h2 className="mt-4 text-2xl font-semibold text-slate-950">
                        {latestApprovedPass.destination}
                      </h2>
                      <p className="mt-3 text-sm leading-7 text-slate-600">{latestApprovedPass.reason}</p>
                      <div className="mt-5 flex items-center justify-between text-sm text-slate-500">
                        <span>{formatDate(latestApprovedPass.departureDate)}</span>
                        <span>Open details</span>
                      </div>
                    </button>
                  ) : (
                    <div className="rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50/80 p-5 text-sm leading-7 text-slate-600">
                      Your first approved pass will appear here as soon as staff complete the review.
                    </div>
                  )}
                </SectionCard>

                <SectionCard
                  title="All records"
                  description="Filter by status and open any record for full detail."
                >
                  <div className="mb-4 flex flex-wrap gap-2">
                    {filters.map((filter) => (
                      <Button
                        key={filter.id}
                        type="button"
                        variant="ghost"
                        onClick={() => setActiveFilter(filter.id)}
                        className={`rounded-full border px-4 ${
                          activeFilter === filter.id
                            ? 'border-transparent bg-slate-950 text-white hover:bg-slate-800'
                            : 'border-white/80 bg-white/80 text-slate-700 hover:bg-white hover:text-slate-950'
                        }`}
                      >
                        {filter.label}
                      </Button>
                    ))}
                  </div>

                  <div className="space-y-3">
                    {filteredPasses.map((pass) => {
                      const status = getPassStatusMeta(pass);

                      return (
                        <button
                          key={pass.id}
                          type="button"
                          onClick={() => setSelectedPass(pass)}
                          className="flex w-full flex-col gap-4 rounded-[1.5rem] border border-white/70 bg-slate-50/90 p-4 text-left transition hover:border-slate-300 hover:bg-white lg:flex-row lg:items-center lg:justify-between"
                        >
                          <div>
                            <p className="text-lg font-semibold text-slate-950">{pass.destination}</p>
                            <p className="mt-1 text-sm text-slate-500">
                              {getPassTypeLabel(pass.type)} • {formatDateTime(pass.createdAt)}
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-3">
                            <StatusBadge label={status.label} tone={`${status.surface} ${status.tone}`} />
                            <span className="text-sm text-slate-500">
                              {formatDate(pass.departureDate)}
                            </span>
                            <div className="rounded-full border border-white/80 bg-white px-3 py-2 text-slate-700">
                              <Eye className="h-4 w-4" />
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </SectionCard>
              </div>
            ) : (
              <EmptyState
                title="No passes yet"
                description="Submit your first request and your pass wallet will fill in with live status, history, and QR readiness."
                action={
                  <Button
                    onClick={() => router.push('/dashboard/request')}
                    className="rounded-full bg-slate-950 text-white hover:bg-slate-800"
                  >
                    Request a pass
                  </Button>
                }
              />
            )}
          </>
        )}
      </div>
    </DashboardShell>
  );
}
