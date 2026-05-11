'use client';

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/lib/auth-context';
import { apiService } from '@/lib/api-service';
import { getDefaultRouteForRole } from '@/lib/firebase/auth';
import {
  formatDate,
  formatDateTime,
  formatDurationDays,
  formatShortDate,
  getPassStatusMeta,
  getPassTypeLabel,
  isPassCurrentlyActive,
} from '@/lib/platform';
import { createPassQrDataUrl } from '@/lib/qr-code';
import type { Pass } from '@/lib/types';

type FilterId = 'all' | 'approved' | 'open' | 'rejected';

const filters: Array<{ id: FilterId; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'approved', label: 'Approved' },
  { id: 'open', label: 'In progress' },
  { id: 'rejected', label: 'Closed' },
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

function getPassDisplayId(pass: Pass) {
  if (pass.qrCode) {
    return pass.qrCode;
  }

  const baseId = (pass.requestId || pass.id || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

  if (!baseId) {
    return 'PENDING';
  }

  if (baseId.length <= 12) {
    return baseId;
  }

  return `${baseId.slice(0, 6)}-${baseId.slice(-6)}`;
}

function getCompactPassDisplayId(pass: Pass) {
  const fullId = getPassDisplayId(pass);

  if (fullId.length <= 18) {
    return fullId;
  }

  return `${fullId.slice(0, 10)}...${fullId.slice(-6)}`;
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
  const [actionError, setActionError] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [cancellingId, setCancellingId] = useState<string | null>(null);

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
        return passes.filter((pass) => ['rejected', 'cancelled'].includes(pass.status));
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
  const selectedPassId = selectedPass ? getPassDisplayId(selectedPass) : '';
  const selectedPassQrImage = useMemo(() => {
    if (!selectedPass?.qrCode) {
      return '';
    }

    try {
      return createPassQrDataUrl(selectedPass.qrCode, {
        moduleSize: 10,
        foreground: '#0f172a',
        background: '#ffffff',
      });
    } catch {
      return '';
    }
  }, [selectedPass]);

  const copyPassId = async () => {
    if (!selectedPass?.qrCode) {
      return;
    }

    await navigator.clipboard.writeText(selectedPass.qrCode);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  };

  const handleCancelRequest = async (pass: Pass) => {
    const requestId = pass.requestId || pass.id;

    if (!requestId) {
      return;
    }

    setCancellingId(pass.id);
    setActionError('');
    setActionMessage('');

    try {
      await apiService.cancelPassRequest(requestId);
      setActionMessage('Pass request cancelled.');
      setSelectedPass(null);
      await loadPasses();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Unable to cancel this request.');
    } finally {
      setCancellingId(null);
    }
  };

  const downloadPass = () => {
    window.print();
  };

  const downloadQrImage = () => {
    if (!selectedPassQrImage || !selectedPassId) {
      return;
    }

    const link = document.createElement('a');
    link.href = selectedPassQrImage;
    link.download = `exitpass-${selectedPassId}.svg`;
    link.click();
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
        <PageHero
          eyebrow="Pass wallet"
          title="Passes"
          description="Keep the list light, then open any pass when you need the full record."
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
              label="Closed"
              value={passes.filter((pass) => ['rejected', 'cancelled'].includes(pass.status)).length}
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
          <div className="grid gap-6 lg:grid-cols-[0.82fr_1.18fr]">
            {actionMessage ? (
              <div className="rounded-[1.5rem] border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 lg:col-span-2">
                {actionMessage}
              </div>
            ) : null}
            {actionError ? (
              <div className="rounded-[1.5rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 lg:col-span-2">
                {actionError}
              </div>
            ) : null}
            <SectionCard
              title="Latest approved pass"
              description="Quick access to your current gate pass."
              className="min-w-0"
            >
              {latestApprovedPass ? (
                <button
                  type="button"
                  onClick={() => setSelectedPass(latestApprovedPass)}
                  className="brand-panel-soft w-full rounded-[1.75rem] border p-5 text-left transition hover:border-slate-300"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <StatusBadge
                      label={getPassStatusMeta(latestApprovedPass).label}
                      tone={`${getPassStatusMeta(latestApprovedPass).surface} ${getPassStatusMeta(latestApprovedPass).tone}`}
                    />
                    <span className="w-full break-all text-[0.68rem] font-semibold uppercase leading-5 tracking-[0.14em] text-slate-500 sm:w-auto sm:text-xs sm:tracking-[0.22em]">
                      {getCompactPassDisplayId(latestApprovedPass)}
                    </span>
                  </div>
                  <h2 className="mt-4 text-2xl font-semibold text-slate-950">
                    {latestApprovedPass.destination}
                  </h2>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{latestApprovedPass.reason}</p>
                  <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500">
                    <span>{formatShortDate(latestApprovedPass.departureDate)}</span>
                    <span>Open pass</span>
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
              description="Compact list. Open any pass for the full details and actions."
              className="min-w-0"
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

              <div className="space-y-2">
                {filteredPasses.map((pass) => {
                  const status = getPassStatusMeta(pass);

                  return (
                    <button
                      key={pass.id}
                      type="button"
                      onClick={() => setSelectedPass(pass)}
                      className="flex w-full flex-col gap-3 rounded-[1.35rem] border border-white/70 bg-slate-50/90 px-4 py-4 text-left transition hover:border-slate-300 hover:bg-white sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-base font-semibold text-slate-950">{pass.destination}</p>
                        <p className="truncate text-sm text-slate-500">
                          {getPassTypeLabel(pass.type)} • {getCompactPassDisplayId(pass)}
                        </p>
                      </div>
                      <div className="flex w-full flex-wrap items-center justify-between gap-2 text-sm text-slate-500 sm:w-auto sm:justify-end">
                        <span>{formatShortDate(pass.departureDate)}</span>
                        <StatusBadge label={status.label} tone={`${status.surface} ${status.tone}`} />
                        <div className="rounded-full border border-white/80 bg-white px-3 py-1.5 text-slate-700">
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

        <Dialog open={Boolean(selectedPass)} onOpenChange={(open) => !open && setSelectedPass(null)}>
          <DialogContent className="max-h-[92vh] w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] overflow-x-hidden overflow-y-auto rounded-[1.5rem] border-slate-200 p-0 sm:max-w-3xl">
            {selectedPass ? (
              <div className="min-w-0 bg-white">
                <div className="min-w-0 border-b border-slate-200 px-4 py-5 sm:px-6">
                  <DialogHeader className="pr-10">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <DialogTitle className="break-words text-xl text-slate-950 sm:text-2xl">{selectedPass.destination}</DialogTitle>
                        <DialogDescription className="mt-2 text-sm leading-6 text-slate-600">
                          {getPassTypeLabel(selectedPass.type)} pass
                        </DialogDescription>
                      </div>
                      <StatusBadge
                        label={getPassStatusMeta(selectedPass).label}
                        tone={`${getPassStatusMeta(selectedPass).surface} ${getPassStatusMeta(selectedPass).tone}`}
                      />
                    </div>
                  </DialogHeader>
                </div>

                <div className="space-y-5 px-4 py-5 sm:px-6 sm:py-6">
                  <div className="grid gap-5 lg:grid-cols-[220px,1fr]">
                    <div className="mx-auto w-full max-w-sm rounded-[1.25rem] border border-slate-200 bg-slate-50 p-5 text-center">
                      <div className="mx-auto flex h-36 w-36 items-center justify-center overflow-hidden rounded-[1rem] border border-dashed border-slate-200 bg-white p-3">
                        {selectedPassQrImage ? (
                          <img
                            src={selectedPassQrImage}
                            alt={`QR code for pass ${selectedPassId}`}
                            className="h-full w-full object-contain"
                          />
                        ) : (
                          <QrCode className="h-16 w-16 text-slate-900" />
                        )}
                      </div>
                      <p className="mt-4 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                        Pass ID
                      </p>
                      <p className="mt-2 break-all text-xs font-semibold leading-6 text-slate-900 sm:text-sm sm:tracking-[0.14em]">
                        {selectedPassId}
                      </p>
                      <p className="mt-3 text-xs leading-5 text-slate-500">
                        Use this same pass ID to leave and return until security marks it returned.
                      </p>
                    </div>

                    <div className="min-w-0 space-y-4">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <SimpleInfoCard label="Departure" value={formatDateTime(selectedPass.departureDate)} />
                        <SimpleInfoCard label="Return" value={formatDateTime(selectedPass.expectedReturnDate)} />
                        <SimpleInfoCard label="Issued" value={formatDateTime(selectedPass.createdAt)} />
                        <SimpleInfoCard label="Duration" value={formatDurationDays(selectedPass.departureDate, selectedPass.expectedReturnDate)} />
                        <SimpleInfoCard label="Stage" value={getPassStatusMeta(selectedPass).label} />
                        <SimpleInfoCard
                          label="Gate Use"
                          value={
                            selectedPass.actualReturnDate
                              ? 'Already used for return.'
                              : 'Use for exit and return.'
                          }
                        />
                      </div>

                      <SimpleInfoCard label="Reason" value={selectedPass.reason} />
                    </div>
                  </div>

                  <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                      Gate Pass ID
                    </p>
                    <p className="mt-2 break-all font-mono text-sm leading-6 text-slate-700">
                      {selectedPass.qrCode || 'Pass ID appears after approval'}
                    </p>
                  </div>

                      <div className="flex flex-col gap-3 sm:flex-row">
                      <Button
                        onClick={downloadPass}
                        disabled={!selectedPass.qrCode}
                        className="h-11 flex-1 rounded-full bg-slate-950 text-white hover:bg-slate-800"
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Print or save pass
                      </Button>
                      <Button
                        variant="outline"
                        onClick={downloadQrImage}
                        disabled={!selectedPassQrImage}
                        className="h-11 rounded-full border-slate-300 bg-white text-slate-900 hover:bg-slate-50 sm:flex-none"
                      >
                        <QrCode className="mr-2 h-4 w-4" />
                        Download QR image
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => void copyPassId()}
                        disabled={!selectedPass.qrCode}
                        className="h-11 rounded-full border-slate-300 bg-white text-slate-900 hover:bg-slate-50 sm:flex-none"
                      >
                        <Copy className="mr-2 h-4 w-4" />
                        {copied ? 'Copied' : 'Copy pass ID'}
                      </Button>
                      {['chaplaincy_required', 'pending'].includes(selectedPass.status) ? (
                        <Button
                          variant="outline"
                          onClick={() => void handleCancelRequest(selectedPass)}
                          disabled={cancellingId === selectedPass.id}
                          className="h-11 rounded-full border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 sm:flex-none"
                        >
                          {cancellingId === selectedPass.id ? (
                            <>
                              <Clock3 className="mr-2 h-4 w-4 animate-pulse" />
                              Cancelling...
                            </>
                          ) : (
                            <>
                              <AlertCircle className="mr-2 h-4 w-4" />
                              Cancel request
                            </>
                          )}
                        </Button>
                      ) : null}
                  </div>

                  <div className="grid gap-3">
                    <SimpleInfoCard label="Chaplaincy" value={getApprovalCopy('Chaplaincy', selectedPass.chaplainApproval)} />
                    <SimpleInfoCard label="Hall Admin" value={getApprovalCopy('Hall admin', selectedPass.hallAdminApproval)} />
                    <SimpleInfoCard
                      label="Return Status"
                      value={
                        selectedPass.actualReturnDate
                          ? `Marked returned on ${formatDateTime(selectedPass.actualReturnDate)}${selectedPass.returnedByName ? ` by ${selectedPass.returnedByName}` : ''}.${selectedPass.returnRemarks ? ` Remarks: ${selectedPass.returnRemarks}` : ''}`
                          : 'Not marked as returned yet.'
                      }
                    />
                    <SimpleInfoCard
                      label="Return Remarks"
                      value={selectedPass.returnRemarks || 'No return remarks recorded.'}
                    />
                  </div>
                </div>
              </div>
            ) : null}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardShell>
  );
}

function SimpleInfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1rem] border border-slate-200 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-2 text-sm leading-6 text-slate-900">{value}</p>
    </div>
  );
}
