'use client';

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { getDefaultRouteForRole } from '@/lib/firebase/auth';
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

function getApprovalCopy(label: string, approval?: Pass['chaplainApproval']) {
  if (!approval) {
    return `Waiting for ${label.toLowerCase()} review.`;
  }

  const actor = approval.approverName || approval.approverRole.replace('_', ' ');
  const outcome = approval.status === 'approved' ? 'Approved' : 'Rejected';
  const remarks = approval.reason ? ` Remarks: ${approval.reason}` : '';

  return `${outcome} by ${actor} on ${formatDateTime(approval.approvedAt)}.${remarks}`;
}

export default function PassesPage() {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const [passes, setPasses] = useState<Pass[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [selectedPass, setSelectedPass] = useState<Pass | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterId>('all');
  const [loadError, setLoadError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/login');
      return;
    }

    if (!isLoading && user?.role !== 'student') {
      navigate(getDefaultRouteForRole(user?.role));
    }
  }, [isLoading, navigate, user]);

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

  if (user?.role !== 'student') {
    return null;
  }

  return (
    <DashboardShell title="My Passes" contentClassName="mx-auto max-w-7xl">
      <div className="space-y-6">
        {selectedPass ? (
          <>
            <PageHero
              eyebrow="Pass detail"
              title={selectedPass.destination}
              description="Pass details and QR access."
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
                description="Ready to view, print, or share."
              >
                <div className="space-y-5">
                  <div className="brand-panel-soft rounded-[2rem] border p-6">
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
                >
                  <div className="grid gap-3">
                    <DetailBlock label="Departure" value={formatDateTime(selectedPass.departureDate)} />
                    <DetailBlock label="Return" value={formatDateTime(selectedPass.expectedReturnDate)} />
                    <DetailBlock
                      label="Actual return"
                      value={
                        selectedPass.actualReturnDate
                          ? formatDateTime(selectedPass.actualReturnDate)
                          : 'Not marked as returned yet'
                      }
                    />
                    <DetailBlock label="Duration" value={formatDurationDays(selectedPass.departureDate, selectedPass.expectedReturnDate)} />
                    <DetailBlock label="Stage" value={getPassStatusMeta(selectedPass).label} />
                    <DetailBlock
                      label="Return remarks"
                      value={selectedPass.returnRemarks || 'No return remarks recorded.'}
                    />
                  </div>
                </SectionCard>

                <SectionCard
                  title="Approval trail"
                  description="Who approved the request."
                >
                  <div className="space-y-3">
                    <div className="rounded-[1.25rem] border border-white/70 bg-slate-50/90 p-4">
                      <p className="font-semibold text-slate-950">Chaplaincy</p>
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        {getApprovalCopy('Chaplaincy', selectedPass.chaplainApproval)}
                      </p>
                    </div>
                    <div className="rounded-[1.25rem] border border-white/70 bg-slate-50/90 p-4">
                      <p className="font-semibold text-slate-950">Hall admin</p>
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        {getApprovalCopy('Hall admin', selectedPass.hallAdminApproval)}
                      </p>
                    </div>
                    {selectedPass.actualReturnDate ? (
                      <div className="rounded-[1.25rem] border border-white/70 bg-slate-50/90 p-4">
                        <p className="font-semibold text-slate-950">Return status</p>
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                          Marked returned on {formatDateTime(selectedPass.actualReturnDate)}
                          {selectedPass.returnedByName ? ` by ${selectedPass.returnedByName}.` : '.'}
                          {selectedPass.returnRemarks ? ` Remarks: ${selectedPass.returnRemarks}` : ''}
                        </p>
                      </div>
                    ) : null}
                  </div>
                </SectionCard>
              </div>
            </div>
          </>
        ) : (
          <>
            <PageHero
              eyebrow="Pass wallet"
              title="Passes"
              description="Open any record to view details or print an approved pass."
              actions={
                <Button
                  onClick={() => navigate('/dashboard/request')}
                  className="brand-cta rounded-full"
                >
                  Request another pass
                </Button>
              }
            >
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard
                  label="Total"
                  value={passes.length}
                  icon={QrCode}
                />
                <MetricCard
                  label="Active"
                  value={activeCount}
                  icon={CheckCircle2}
                  accentClassName="brand-icon-chip"
                />
                <MetricCard
                  label="In review"
                  value={passes.filter((pass) => ['pending', 'chaplaincy_required'].includes(pass.status)).length}
                  icon={Clock3}
                  accentClassName="brand-icon-chip"
                />
                <MetricCard
                  label="Rejected"
                  value={countPassesByStatus(passes, 'rejected')}
                  icon={XCircle}
                  accentClassName="brand-icon-chip"
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
                  description="Quick access to your latest approved pass."
                >
                  {latestApprovedPass ? (
                    <button
                      type="button"
                      onClick={() => setSelectedPass(latestApprovedPass)}
                      className="brand-panel-soft w-full rounded-[1.75rem] border p-5 text-left transition hover:border-slate-300"
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
                        <span>View</span>
                      </div>
                    </button>
                  ) : (
                    <div className="rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50/80 p-5 text-sm leading-7 text-slate-600">
                      Your first approved pass will appear here.
                    </div>
                  )}
                </SectionCard>

                <SectionCard
                  title="All records"
                  description="Filter and open any record."
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
                description="Submit your first request to start your pass history."
                action={
                  <Button
                    onClick={() => navigate('/dashboard/request')}
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
