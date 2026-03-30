'use client';

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  CheckCircle2,
  History,
  MapPin,
  QrCode,
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
import { useAuth } from '@/lib/auth-context';
import { apiService } from '@/lib/api-service';
import { getDefaultRouteForRole } from '@/lib/firebase/auth';
import { formatDateTime } from '@/lib/platform';

type VerificationResult = {
  pass: any;
  isValid: boolean;
  message: string;
} | null;

type ScanRecord = {
  id: string;
  qrCode: string;
  location: string;
  status: string;
  timestamp: string;
};

export default function SecurityScannerPage() {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const [qrInput, setQrInput] = useState('');
  const [verificationResult, setVerificationResult] = useState<VerificationResult>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanHistory, setScanHistory] = useState<ScanRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('scanner');

  useEffect(() => {
    if (!isLoading && user?.role !== 'security') {
      navigate(getDefaultRouteForRole(user?.role));
    }
  }, [isLoading, navigate, user?.role]);

  useEffect(() => {
    if (activeTab === 'history') {
      void loadScanHistory();
    }
  }, [activeTab]);

  const loadScanHistory = async () => {
    setHistoryLoading(true);

    try {
      const history = await apiService.getScanHistory(20);
      setScanHistory(history);
    } catch (error) {
      console.error('Error loading scan history:', error);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleScan = async () => {
    if (!qrInput.trim()) {
      return;
    }

    setIsScanning(true);

    try {
      const result = await apiService.verifyQRCode(qrInput);

      if (result?.pass) {
        await apiService.logScan(qrInput, 'Main Gate');
        setVerificationResult(result);
        setQrInput('');
        void loadScanHistory();
      } else {
        setVerificationResult({
          pass: null,
          isValid: false,
          message: 'QR code not found or invalid.',
        });
      }
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
  };

  const latestScan = scanHistory[0] ?? null;
  const successfulScans = useMemo(
    () => scanHistory.filter((scan) => scan.status === 'success').length,
    [scanHistory],
  );

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
          title="Gate scanner"
          description="Scan a QR code, confirm the record, and keep a scan log."
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
            <MetricCard
              label="Recent scans"
              value={scanHistory.length}
              icon={History}
            />
            <MetricCard
              label="Successful"
              value={successfulScans}
              icon={CheckCircle2}
              accentClassName="brand-icon-chip"
            />
            <MetricCard
              label="Gate"
              value="Main Gate"
              icon={ShieldCheck}
              accentClassName="brand-icon-chip"
            />
            <MetricCard
              label="View"
              value={activeTab === 'scanner' ? 'Scanner' : 'History'}
              icon={ScanLine}
              accentClassName="brand-icon-chip"
            />
          </div>
        </PageHero>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="brand-panel grid h-auto w-full grid-cols-2 gap-2 rounded-[1.5rem] border p-2">
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
          </TabsList>

          <TabsContent value="scanner" className="space-y-6">
            <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
              <SectionCard
                title="Live scan"
                description="Paste a QR value or scan into the field."
              >
                <div className="space-y-5">
                  <div className="brand-panel-soft rounded-[2rem] border p-6">
                    <div className="brand-grid rounded-[1.5rem] border border-dashed border-blue-200 bg-white/85 p-8 text-center">
                      <QrCode className="mx-auto h-16 w-16 text-slate-900" />
                      <p className="mt-4 text-sm font-medium text-slate-700">
                        Scan or paste pass data.
                      </p>
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
                    <QrCode className="mr-2 h-5 w-5" />
                    {isScanning ? 'Verifying pass...' : 'Verify pass'}
                  </Button>
                </div>
              </SectionCard>

              <SectionCard
                title="Verification result"
                description="Latest result."
              >
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
                          label={verificationResult.isValid ? 'Valid pass' : 'Not cleared'}
                          tone={
                            verificationResult.isValid
                              ? 'border-blue-200 bg-blue-50 text-blue-800'
                              : 'border-slate-300 bg-slate-100 text-slate-800'
                          }
                        />
                      </div>
                    </div>

                    {verificationResult.pass ? (
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
                      </div>
                    ) : (
                      <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50/85 p-5 text-sm leading-7 text-slate-600">
                        No active pass record was found.
                      </div>
                    )}
                  </div>
                ) : (
                  <EmptyState
                    title="No scan result yet"
                    description="Run a scan to view pass details."
                  />
                )}
              </SectionCard>
            </div>

            <SectionCard
              title="Gate checks"
              description="Quick checks before exit."
            >
              <div className="grid gap-3 md:grid-cols-3">
                {[
                  'Match the student name and matric number.',
                  'Check destination and return time.',
                  'If not cleared, send the student back to staff.',
                ].map((item, index) => (
                  <Card key={item} className="brand-panel-soft border">
                    <CardContent className="p-5">
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                        Step 0{index + 1}
                      </p>
                      <p className="mt-3 text-sm leading-7 text-slate-700">{item}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </SectionCard>
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            {historyLoading ? (
              <LoadingPanel label="Loading scan history..." />
            ) : scanHistory.length ? (
              <div className="grid gap-6 xl:grid-cols-[0.78fr_1.22fr]">
                <SectionCard
                  title="Latest scan"
                  description="Most recent scan."
                >
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
                        <DetailBlock label="Timestamp" value={formatDateTime(latestScan.timestamp)} />
                      </div>
                    </div>
                  ) : null}
                </SectionCard>

                <SectionCard
                  title="Recent history"
                  description="Recent scan records."
                >
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
              <EmptyState
                title="No scan history yet"
                description="Completed scans will appear here."
              />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardShell>
  );
}
