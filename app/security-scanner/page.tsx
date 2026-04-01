'use client';

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  History,
  MapPin,
  QrCode,
  RotateCcw,
  ScanLine,
  ShieldCheck,
  User as UserIcon,
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
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/lib/auth-context';
import { apiService } from '@/lib/api-service';
import { getDefaultRouteForRole } from '@/lib/firebase/auth';
import { formatDateTime } from '@/lib/platform';
import type { Pass, PassVerificationResult, ScanLog } from '@/lib/types';

export default function SecurityScannerPage() {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const [qrInput, setQrInput] = useState('');
  const [verificationResult, setVerificationResult] = useState<PassVerificationResult | null>(null);
  const [returnRemarks, setReturnRemarks] = useState('');
  const [scanHistory, setScanHistory] = useState<ScanLog[]>([]);
  const [overduePasses, setOverduePasses] = useState<Pass[]>([]);
  const [activeTab, setActiveTab] = useState('scanner');
  const [isScanning, setIsScanning] = useState(false);
  const [securityLoading, setSecurityLoading] = useState(true);
  const [processingReturnId, setProcessingReturnId] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && user?.role !== 'security') {
      navigate(getDefaultRouteForRole(user?.role));
    }
  }, [isLoading, navigate, user?.role]);

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    void loadSecurityData();
  }, [user?.id]);

  const loadSecurityData = async () => {
    setSecurityLoading(true);

    try {
      const [history, overdue] = await Promise.all([
        apiService.getScanHistory(20),
        apiService.getOverduePasses(),
      ]);
      setScanHistory(history);
      setOverduePasses(overdue);
    } finally {
      setSecurityLoading(false);
    }
  };

  const handleScan = async () => {
    if (!qrInput.trim()) {
      return;
    }

    setIsScanning(true);

    try {
      const result = await apiService.verifyQRCode(qrInput);
      await apiService.logScan(qrInput, 'Main Gate');
      setVerificationResult(result);
      setReturnRemarks('');
      setQrInput('');
      await loadSecurityData();
    } catch (error) {
      setVerificationResult({
        pass: null,
        isValid: false,
        message: 'Error verifying QR code.',
      });
    } finally {
      setIsScanning(false);
    }
  };

  const handleClearResult = () => {
    setVerificationResult(null);
    setQrInput('');
    setReturnRemarks('');
  };

  const handleMarkReturned = async (passId: string, remarks?: string) => {
    setProcessingReturnId(passId);

    try {
      const updatedPass = await apiService.markPassReturned(passId, remarks);
      if (verificationResult?.pass?.id === passId) {
        setVerificationResult({
          pass: updatedPass,
          isValid: false,
          message: 'Student marked as returned.',
        });
      }
      setReturnRemarks('');
      await loadSecurityData();
    } finally {
      setProcessingReturnId(null);
    }
  };

  const latestScan = scanHistory[0] ?? null;
  const successfulScans = useMemo(
    () => scanHistory.filter((scan) => scan.status === 'success').length,
    [scanHistory],
  );
  const canMarkReturned =
    Boolean(verificationResult?.pass) &&
    verificationResult?.pass?.status === 'approved' &&
    !verificationResult.pass.actualReturnDate;

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  if (user?.role !== 'security') {
    return null;
  }

  return (
    <DashboardShell title="Security Scanner" contentClassName="mx-auto max-w-7xl pb-20 lg:pb-8">
      <div className="space-y-6">
        <PageHero
          eyebrow="Gate operations"
          title="Security operations"
          description="Verify passes, mark students as returned, and watch overdue return alerts."
          actions={
            verificationResult ? (
              <Button
                variant="outline"
                onClick={handleClearResult}
                className="rounded-full border-white/80 bg-white/80 text-slate-900 hover:bg-white"
              >
                Clear current result
              </Button>
            ) : undefined
          }
        >
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Recent scans" value={scanHistory.length} icon={History} />
            <MetricCard
              label="Successful"
              value={successfulScans}
              icon={CheckCircle2}
              accentClassName="brand-icon-chip"
            />
            <MetricCard
              label="Overdue returns"
              value={overduePasses.length}
              icon={Clock3}
              accentClassName="brand-icon-chip"
            />
            <MetricCard
              label="Gate"
              value="Main Gate"
              icon={ShieldCheck}
              accentClassName="brand-icon-chip"
            />
          </div>
        </PageHero>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="brand-panel grid h-auto w-full grid-cols-3 gap-2 rounded-[1.5rem] border p-2">
            <TabsTrigger
              value="scanner"
              className="rounded-[1rem] text-xs data-[state=active]:bg-slate-950 data-[state=active]:text-white sm:text-sm"
            >
              <QrCode className="mr-2 h-4 w-4" />
              Scanner
            </TabsTrigger>
            <TabsTrigger
              value="history"
              className="rounded-[1rem] text-xs data-[state=active]:bg-slate-950 data-[state=active]:text-white sm:text-sm"
            >
              <History className="mr-2 h-4 w-4" />
              History
            </TabsTrigger>
            <TabsTrigger
              value="overdue"
              className="rounded-[1rem] text-xs data-[state=active]:bg-slate-950 data-[state=active]:text-white sm:text-sm"
            >
              <Clock3 className="mr-2 h-4 w-4" />
              Overdue
            </TabsTrigger>
          </TabsList>

          <TabsContent value="scanner" className="space-y-6">
            <div className="grid gap-6 xl:grid-cols-[1.02fr_0.98fr]">
              <SectionCard title="Live scan" description="Paste or scan a QR value.">
                <div className="space-y-5">
                  <div className="brand-panel-soft rounded-[2rem] border p-6">
                    <div className="brand-grid rounded-[1.5rem] border border-dashed border-blue-200 bg-white/85 p-8 text-center">
                      <QrCode className="mx-auto h-16 w-16 text-slate-900" />
                      <p className="mt-4 text-sm font-medium text-slate-700">Scan or paste pass data.</p>
                    </div>

                    <div className="mt-5 space-y-3">
                      <label className="text-sm font-medium text-slate-700">QR input</label>
                      <Input
                        placeholder="Paste QR code data here..."
                        value={qrInput}
                        onChange={(event) => setQrInput(event.target.value)}
                        onKeyDown={(event) => event.key === 'Enter' && void handleScan()}
                        className="h-12 rounded-2xl border-slate-200 bg-white/85 font-mono text-sm"
                        autoFocus
                      />
                    </div>
                  </div>

                  <Button
                    onClick={() => void handleScan()}
                    disabled={!qrInput.trim() || isScanning}
                    className="brand-cta h-12 w-full rounded-full"
                    size="lg"
                  >
                    <ScanLine className="mr-2 h-5 w-5" />
                    {isScanning ? 'Verifying pass...' : 'Verify pass'}
                  </Button>
                </div>
              </SectionCard>

              <SectionCard title="Verification result" description="Latest pass status.">
                {verificationResult ? (
                  <div className="space-y-5">
                    <div className="brand-panel-soft rounded-[1.75rem] border p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className="brand-icon-chip rounded-2xl border p-3">
                            {verificationResult.isValid ? (
                              <CheckCircle2 className="h-5 w-5 text-blue-700" />
                            ) : (
                              <AlertCircle className="h-5 w-5 text-slate-700" />
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">
                              Scan status
                            </p>
                            <h2 className="mt-2 text-2xl font-semibold text-slate-950">
                              {verificationResult.message}
                            </h2>
                          </div>
                        </div>
                        <StatusBadge
                          label={verificationResult.isValid ? 'Valid pass' : 'Attention needed'}
                          tone={
                            verificationResult.isValid
                              ? 'border-blue-200 bg-blue-50 text-blue-800'
                              : 'border-slate-300 bg-slate-100 text-slate-800'
                          }
                        />
                      </div>
                    </div>

                    {verificationResult.pass ? (
                      <>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <DetailBlock
                            label="Student"
                            value={
                              <span className="inline-flex items-center gap-2">
                                <UserIcon className="h-4 w-4 text-slate-500" />
                                {verificationResult.pass.student?.name || 'Unknown'}
                              </span>
                            }
                          />
                          <DetailBlock label="Matric no." value={verificationResult.pass.student?.matric || 'Not available'} />
                          <DetailBlock
                            label="Destination"
                            value={
                              <span className="inline-flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-slate-500" />
                                {verificationResult.pass.destination}
                              </span>
                            }
                          />
                          <DetailBlock label="Pass type" value={verificationResult.pass.type} />
                          <DetailBlock label="Departure" value={formatDateTime(verificationResult.pass.departureDate)} />
                          <DetailBlock label="Return" value={formatDateTime(verificationResult.pass.expectedReturnDate)} />
                          <DetailBlock
                            label="Actual return"
                            value={
                              verificationResult.pass.actualReturnDate
                                ? formatDateTime(verificationResult.pass.actualReturnDate)
                                : 'Not marked yet'
                            }
                          />
                          <DetailBlock
                            label="Status"
                            value={verificationResult.pass.actualReturnDate ? 'Returned' : verificationResult.pass.status}
                          />
                        </div>

                        {canMarkReturned ? (
                          <div className="space-y-3 rounded-[1.5rem] border border-blue-100/80 bg-white/80 p-4">
                            <p className="font-medium text-slate-950">Return action</p>
                            <Textarea
                              value={returnRemarks}
                              onChange={(event) => setReturnRemarks(event.target.value)}
                              placeholder="Optional return remarks"
                              rows={3}
                              className="rounded-[1.25rem] border-slate-200 bg-white/85"
                            />
                            <Button
                              onClick={() => void handleMarkReturned(verificationResult.pass!.id, returnRemarks)}
                              disabled={processingReturnId === verificationResult.pass.id}
                              className="brand-cta rounded-full border-0"
                            >
                              <RotateCcw className="mr-2 h-4 w-4" />
                              {processingReturnId === verificationResult.pass.id ? 'Saving return...' : 'Mark as returned'}
                            </Button>
                          </div>
                        ) : null}
                      </>
                    ) : (
                      <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50/85 p-5 text-sm leading-7 text-slate-600">
                        No pass record was found for this scan.
                      </div>
                    )}
                  </div>
                ) : (
                  <EmptyState title="No scan result yet" description="Run a scan to view pass details." />
                )}
              </SectionCard>
            </div>
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            {securityLoading ? (
              <LoadingPanel label="Loading scan history..." />
            ) : scanHistory.length ? (
              <div className="grid gap-6 xl:grid-cols-[0.78fr_1.22fr]">
                <SectionCard title="Latest scan" description="Most recent scan event.">
                  {latestScan ? (
                    <div className="brand-panel-soft rounded-[1.75rem] border p-5">
                      <StatusBadge
                        label={latestScan.status}
                        tone={
                          latestScan.status === 'success'
                            ? 'border-blue-200 bg-blue-50 text-blue-800'
                            : 'border-slate-300 bg-slate-100 text-slate-800'
                        }
                      />
                      <p className="mt-4 font-mono text-sm text-slate-700">{latestScan.qrCode}</p>
                      <div className="mt-5 grid gap-3">
                        <DetailBlock label="Location" value={latestScan.location} />
                        <DetailBlock label="Event" value={latestScan.eventType || 'scan'} />
                        <DetailBlock label="Timestamp" value={formatDateTime(latestScan.timestamp)} />
                      </div>
                    </div>
                  ) : null}
                </SectionCard>

                <SectionCard title="Recent history" description="Recent scan and return records.">
                  <div className="space-y-3">
                    {scanHistory.map((scan) => (
                      <div
                        key={scan.id}
                        className="flex flex-col gap-4 rounded-[1.5rem] border border-white/70 bg-slate-50/90 p-4 text-left transition hover:border-blue-200 hover:bg-white lg:flex-row lg:items-center lg:justify-between"
                      >
                        <div>
                          <p className="font-mono text-sm text-slate-800">{scan.qrCode}</p>
                          <p className="mt-1 text-sm text-slate-500">
                            {scan.location} • {formatDateTime(scan.timestamp)}
                          </p>
                          <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-400">
                            {scan.eventType || 'scan'}
                          </p>
                        </div>
                        <StatusBadge
                          label={scan.status}
                          tone={
                            scan.status === 'success'
                              ? 'border-blue-200 bg-blue-50 text-blue-800'
                              : 'border-slate-300 bg-slate-100 text-slate-800'
                          }
                        />
                      </div>
                    ))}
                  </div>
                </SectionCard>
              </div>
            ) : (
              <EmptyState title="No scan history yet" description="Completed scans will appear here." />
            )}
          </TabsContent>

          <TabsContent value="overdue" className="space-y-6">
            {securityLoading ? (
              <LoadingPanel label="Loading overdue return alerts..." />
            ) : overduePasses.length ? (
              <SectionCard
                title="Overdue returns"
                description="Students whose return date has passed and have not been marked as returned."
              >
                <div className="space-y-3">
                  {overduePasses.map((pass) => (
                    <div key={pass.id} className="rounded-[1.5rem] border border-white/70 bg-slate-50/90 p-4">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                          <p className="font-semibold text-slate-950">{pass.student?.name || 'Unknown student'}</p>
                          <p className="mt-1 text-sm text-slate-500">
                            {pass.student?.matric || 'No matric'} • {pass.destination}
                          </p>
                          <p className="mt-2 text-sm text-slate-600">
                            Expected back {formatDateTime(pass.expectedReturnDate)}
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <StatusBadge
                            label="Overdue"
                            tone="border-slate-300 bg-slate-100 text-slate-800"
                          />
                          <Button
                            onClick={() => void handleMarkReturned(pass.id)}
                            disabled={processingReturnId === pass.id}
                            className="brand-cta rounded-full border-0"
                          >
                            <RotateCcw className="mr-2 h-4 w-4" />
                            {processingReturnId === pass.id ? 'Saving...' : 'Mark returned'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </SectionCard>
            ) : (
              <EmptyState title="No overdue returns" description="Every approved pass is either within time or already marked as returned." />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardShell>
  );
}
