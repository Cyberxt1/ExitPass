'use client';

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  Bell,
  Camera,
  CheckCircle2,
  Clock3,
  History,
  Keyboard,
  MapPin,
  Plus,
  RotateCcw,
  Send,
  ShieldCheck,
  Upload,
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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/lib/auth-context';
import { apiService } from '@/lib/api-service';
import { getDefaultRouteForRole } from '@/lib/firebase/auth';
import { formatDateTime } from '@/lib/platform';
import type { Announcement, Pass, PassVerificationResult, ScanLog } from '@/lib/types';
import jsQR from 'jsqr';

type SecurityTabId = 'history' | 'overdue' | 'updates';
type VerifyMode = 'scan' | 'upload' | 'manual';

type DetectedBarcode = {
  rawValue?: string;
};

type BarcodeDetectorInstance = {
  detect: (source: ImageBitmapSource) => Promise<DetectedBarcode[]>;
};

type BarcodeDetectorConstructor = {
  new (options?: { formats?: string[] }): BarcodeDetectorInstance;
  getSupportedFormats?: () => Promise<string[]>;
};

function getPassCodeLabel(pass?: Pass | null, fallback = 'Not assigned yet') {
  return pass?.qrCode || fallback;
}

function getCheckEventLabel(eventType?: 'scan' | 'return') {
  return eventType === 'return' ? 'return' : 'verification';
}

export default function SecurityScannerPage() {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const scanTimerRef = useRef<number | null>(null);
  const activeStreamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<BarcodeDetectorInstance | null>(null);
  const scanningBusyRef = useRef(false);
  const [passCodeInput, setPassCodeInput] = useState('');
  const [verificationResult, setVerificationResult] = useState<PassVerificationResult | null>(null);
  const [returnRemarks, setReturnRemarks] = useState('');
  const [scanHistory, setScanHistory] = useState<ScanLog[]>([]);
  const [overduePasses, setOverduePasses] = useState<Pass[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [activeTab, setActiveTab] = useState<SecurityTabId>('history');
  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [securityLoading, setSecurityLoading] = useState(true);
  const [announcementsLoading, setAnnouncementsLoading] = useState(true);
  const [processingReturnId, setProcessingReturnId] = useState<string | null>(null);
  const [announcementDraft, setAnnouncementDraft] = useState({ title: '', message: '' });
  const [updateMessage, setUpdateMessage] = useState('');
  const [updateError, setUpdateError] = useState('');
  const [verifyMode, setVerifyMode] = useState<VerifyMode>('scan');
  const [scannerAvailable, setScannerAvailable] = useState(false);
  const [scannerStatus, setScannerStatus] = useState('Point the camera at the pass QR code.');
  const [uploadStatus, setUploadStatus] = useState('');

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
    void loadAnnouncements();
  }, [user?.id]);

  useEffect(() => {
    const hasCameraSupport =
      typeof navigator !== 'undefined' &&
      Boolean(navigator.mediaDevices?.getUserMedia);

    setScannerAvailable(hasCameraSupport);
  }, []);

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  useEffect(() => {
    if (!verifyModalOpen) {
      stopScanner();
      return;
    }

    if (verifyMode === 'scan') {
      void startScanner();
      return;
    }

    stopScanner();
  }, [verifyModalOpen, verifyMode]);

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

  const loadAnnouncements = async () => {
    setAnnouncementsLoading(true);

    try {
      setAnnouncements(await apiService.getAnnouncements(user?.role));
    } finally {
      setAnnouncementsLoading(false);
    }
  };

  const clearVerificationState = () => {
    setPassCodeInput('');
    setVerificationResult(null);
    setReturnRemarks('');
    setUploadStatus('');
    setScannerStatus('Point the camera at the pass QR code.');
  };

  const stopScanner = () => {
    if (scanTimerRef.current !== null) {
      window.clearTimeout(scanTimerRef.current);
      scanTimerRef.current = null;
    }

    scanningBusyRef.current = false;

    if (activeStreamRef.current) {
      activeStreamRef.current.getTracks().forEach((track) => track.stop());
      activeStreamRef.current = null;
    }

    if (videoRef.current) {
      (videoRef.current as HTMLVideoElement & { srcObject: MediaStream | null }).srcObject = null;
    }
  };

  const getBarcodeDetector = async () => {
    const detectorConstructor = (window as Window & { BarcodeDetector?: BarcodeDetectorConstructor }).BarcodeDetector;

    if (!detectorConstructor) {
      throw new Error('QR scanning is not supported in this browser yet.');
    }

    if (typeof detectorConstructor.getSupportedFormats === 'function') {
      const formats = await detectorConstructor.getSupportedFormats();
      if (!formats.includes('qr_code')) {
        throw new Error('This browser can open the camera, but QR scanning is unavailable.');
      }
    }

    return new detectorConstructor({ formats: ['qr_code'] });
  };

  const decodeQrFromCanvas = (canvas: HTMLCanvasElement) => {
    const context = canvas.getContext('2d', { willReadFrequently: true });

    if (!context) {
      return '';
    }

    const { width, height } = canvas;
    const imageData = context.getImageData(0, 0, width, height);
    const decoded = jsQR(imageData.data, width, height);
    return decoded?.data?.trim() || '';
  };

  const drawVideoFrameToCanvas = (video: HTMLVideoElement) => {
    const canvas = canvasRef.current;

    if (!canvas || !video.videoWidth || !video.videoHeight) {
      return null;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');

    if (!context) {
      return null;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas;
  };

  const handleDetectedCode = async (rawValue: string) => {
    const normalizedValue = rawValue.trim();

    if (!normalizedValue || isVerifying) {
      return;
    }

    setPassCodeInput(normalizedValue);
    stopScanner();
    setScannerStatus('QR code detected. Checking pass...');
    await runVerification(normalizedValue);
  };

  const queueScanFrame = () => {
    scanTimerRef.current = window.setTimeout(() => {
      void scanFrame();
    }, 300);
  };

  const scanFrame = async () => {
    if (!verifyModalOpen || verifyMode !== 'scan' || !videoRef.current || !detectorRef.current) {
      return;
    }

    const video = videoRef.current;

    if (video.readyState < 2) {
      queueScanFrame();
      return;
    }

    if (scanningBusyRef.current) {
      queueScanFrame();
      return;
    }

    scanningBusyRef.current = true;

    try {
      let detectedValue = '';

      if (detectorRef.current) {
        const detections = await detectorRef.current.detect(video);
        detectedValue = detections.find((item) => item.rawValue?.trim())?.rawValue?.trim() || '';
      } else {
        const canvas = drawVideoFrameToCanvas(video);
        detectedValue = canvas ? decodeQrFromCanvas(canvas) : '';
      }

      if (detectedValue) {
        await handleDetectedCode(detectedValue);
        return;
      }
    } catch {
      setScannerStatus('Camera is open, but no QR code has been read yet.');
    } finally {
      scanningBusyRef.current = false;
    }

    queueScanFrame();
  };

  const startScanner = async () => {
    if (!scannerAvailable) {
      setScannerStatus('This device cannot open the camera. Use image upload or type the pass ID.');
      return;
    }

    stopScanner();
    setScannerStatus('Opening camera...');

    try {
      try {
        detectorRef.current = await getBarcodeDetector();
      } catch {
        detectorRef.current = null;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
        },
        audio: false,
      });
      activeStreamRef.current = stream;

      if (videoRef.current) {
        (videoRef.current as HTMLVideoElement & { srcObject: MediaStream | null }).srcObject = stream;
        await videoRef.current.play();
      }

      setScannerStatus(
        detectorRef.current
          ? 'Point the camera at the pass QR code.'
          : 'Point the camera at the pass QR code. Using built-in fallback scanner.',
      );
      queueScanFrame();
    } catch (error) {
      stopScanner();
      setScannerStatus(error instanceof Error ? error.message : 'Unable to open the QR scanner.');
    }
  };

  const runVerification = async (value: string) => {
    setIsVerifying(true);

    try {
      const normalizedPassCode = value.trim();
      const result = await apiService.verifyPassCode(normalizedPassCode);
      await apiService.logPassVerification(normalizedPassCode, 'Main Gate');
      setVerificationResult(result);
      await loadSecurityData();
    } catch (error) {
      setVerificationResult({
        pass: null,
        isValid: false,
        message: 'Error verifying pass ID.',
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleVerifyPass = async () => {
    if (!passCodeInput.trim()) {
      return;
    }

    await runVerification(passCodeInput);
  };

  const handleVerifyModalChange = (open: boolean) => {
    setVerifyModalOpen(open);

    if (!open) {
      stopScanner();
      clearVerificationState();
    }
  };

  const handleScanModeChange = (nextMode: VerifyMode) => {
    setVerifyMode(nextMode);
    setVerificationResult(null);
    setUploadStatus('');
  };

  const handleUploadQrImage = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    setUploadStatus('');

    try {
      const imageBitmap = await createImageBitmap(file);
      const barcodeDetector = await getBarcodeDetector().catch(() => null);
      let detectedValue = '';

      if (barcodeDetector) {
        const detections = await barcodeDetector.detect(imageBitmap);
        detectedValue = detections.find((item) => item.rawValue?.trim())?.rawValue?.trim() || '';
      } else {
        const canvas = canvasRef.current;

        if (!canvas) {
          throw new Error('QR image scanning is unavailable right now.');
        }

        canvas.width = imageBitmap.width;
        canvas.height = imageBitmap.height;
        const context = canvas.getContext('2d');

        if (!context) {
          imageBitmap.close();
          throw new Error('QR image scanning is unavailable right now.');
        }

        context.drawImage(imageBitmap, 0, 0, canvas.width, canvas.height);
        detectedValue = decodeQrFromCanvas(canvas);
      }

      imageBitmap.close();

      if (!detectedValue) {
        setUploadStatus('No QR code was found in that image.');
        return;
      }

      setUploadStatus(`QR code found: ${detectedValue}`);
      setPassCodeInput(detectedValue);
      await runVerification(detectedValue);
    } catch (error) {
      setUploadStatus(error instanceof Error ? error.message : 'Unable to read that QR image.');
    }
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

  const handleSendUpdate = async () => {
    const title = announcementDraft.title.trim();
    const message = announcementDraft.message.trim();

    if (!title || !message) {
      setUpdateMessage('');
      setUpdateError('Add a title and message before sending the update.');
      return;
    }

    setUpdateMessage('');
    setUpdateError('');

    try {
      await apiService.sendAnnouncement(title, message);
      setAnnouncementDraft({ title: '', message: '' });
      setUpdateMessage('Platform update sent successfully.');
      await loadAnnouncements();
    } catch (error) {
      setUpdateMessage('');
      setUpdateError(error instanceof Error ? error.message : 'Unable to send the update right now.');
    }
  };

  const latestCheck = scanHistory[0] ?? null;
  const successfulChecks = useMemo(
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
    <DashboardShell title="Security Desk" contentClassName="mx-auto max-w-7xl pb-24 lg:pb-10">
      <div className="space-y-6">
        <PageHero
          eyebrow="Gate operations"
          title="Security operations"
          description="Verify approved passes with a 7-digit pass ID, record returns, and monitor overdue students."
        >
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Recent checks" value={scanHistory.length} icon={History} />
            <MetricCard
              label="Successful"
              value={successfulChecks}
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

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as SecurityTabId)} className="w-full">
          <TabsList className="brand-panel grid h-auto w-full grid-cols-3 gap-2 rounded-[1.5rem] border p-2">
            <TabsTrigger
              value="history"
              className="rounded-[1rem] text-xs sm:text-sm"
            >
              <History className="mr-2 h-4 w-4" />
              History
            </TabsTrigger>
            <TabsTrigger
              value="overdue"
              className="rounded-[1rem] text-xs sm:text-sm"
            >
              <Clock3 className="mr-2 h-4 w-4" />
              Overdue
            </TabsTrigger>
            <TabsTrigger
              value="updates"
              className="rounded-[1rem] text-xs sm:text-sm"
            >
              <Bell className="mr-2 h-4 w-4" />
              Updates
            </TabsTrigger>
          </TabsList>

          <TabsContent value="history" className="space-y-6">
            {securityLoading ? (
              <LoadingPanel label="Loading verification history..." />
            ) : scanHistory.length ? (
              <div className="grid gap-6 xl:grid-cols-[0.82fr_1.18fr]">
                <SectionCard title="Latest check" description="Most recent pass verification or return event.">
                  {latestCheck ? (
                    <div className="brand-panel-soft rounded-[1.75rem] border p-5">
                      <StatusBadge
                        label={latestCheck.status}
                        tone={
                          latestCheck.status === 'success'
                            ? 'border-blue-200 bg-blue-50 text-blue-800'
                            : 'border-slate-300 bg-slate-100 text-slate-800'
                        }
                      />
                      <p className="mt-4 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                        Pass ID
                      </p>
                      <p className="mt-2 font-mono text-2xl font-semibold tracking-[0.18em] text-slate-900">
                        {latestCheck.qrCode}
                      </p>
                      <div className="mt-5 grid gap-3">
                        <DetailBlock label="Location" value={latestCheck.location} />
                        <DetailBlock label="Event" value={getCheckEventLabel(latestCheck.eventType)} />
                        <DetailBlock label="Timestamp" value={formatDateTime(latestCheck.timestamp)} />
                      </div>
                    </div>
                  ) : null}
                </SectionCard>

                <SectionCard title="Recent history" description="Latest verification and return activity at the gate.">
                  <div className="space-y-3">
                    {scanHistory.map((scan) => (
                      <div
                        key={scan.id}
                        className="flex flex-col gap-4 rounded-[1.5rem] border border-white/70 bg-slate-50/90 p-4 text-left transition hover:border-blue-200 hover:bg-white lg:flex-row lg:items-center lg:justify-between"
                      >
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                            Pass ID
                          </p>
                          <p className="mt-2 font-mono text-sm text-slate-800">{scan.qrCode}</p>
                          <p className="mt-1 text-sm text-slate-500">
                            {scan.location} • {formatDateTime(scan.timestamp)}
                          </p>
                          <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-400">
                            {getCheckEventLabel(scan.eventType)}
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
              <EmptyState title="No verification history yet" description="Pass checks and return records will appear here." />
            )}
          </TabsContent>

          <TabsContent value="overdue" className="space-y-6">
            {securityLoading ? (
              <LoadingPanel label="Loading overdue return alerts..." />
            ) : overduePasses.length ? (
              <SectionCard
                title="Overdue returns"
                description="Students whose expected return time has passed and have not been marked as returned."
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
                            Pass ID {getPassCodeLabel(pass)}
                          </p>
                          <p className="mt-1 text-sm text-slate-600">
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
              <EmptyState title="No overdue returns" description="Every approved pass is either still valid or already marked as returned." />
            )}
          </TabsContent>

          <TabsContent value="updates" className="space-y-6">
            <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
              <SectionCard
                title="Platform update"
                description="Send one broadcast notice to everyone signed in on the platform."
              >
                <div className="space-y-4">
                  {updateMessage ? (
                    <div className="rounded-[1.25rem] border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                      {updateMessage}
                    </div>
                  ) : null}
                  {updateError ? (
                    <div className="rounded-[1.25rem] border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700">
                      {updateError}
                    </div>
                  ) : null}

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Title</label>
                    <Input
                      value={announcementDraft.title}
                      onChange={(event) =>
                        setAnnouncementDraft((currentValue) => ({
                          ...currentValue,
                          title: event.target.value,
                        }))
                      }
                      placeholder="Gate notice title"
                      className="h-12 rounded-2xl border-slate-200 bg-white/85"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Message</label>
                    <Textarea
                      value={announcementDraft.message}
                      onChange={(event) =>
                        setAnnouncementDraft((currentValue) => ({
                          ...currentValue,
                          message: event.target.value,
                        }))
                      }
                      placeholder="Share the update that staff and students should see."
                      rows={6}
                      className="rounded-[1.25rem] border-slate-200 bg-white/85"
                    />
                  </div>

                  <Button onClick={() => void handleSendUpdate()} className="brand-cta h-12 w-full rounded-full border-0">
                    <Send className="mr-2 h-4 w-4" />
                    Send platform update
                  </Button>
                </div>
              </SectionCard>

              <SectionCard title="Recent updates" description="The latest broadcasts already visible across the platform.">
                {announcementsLoading ? (
                  <LoadingPanel label="Loading updates..." />
                ) : announcements.length ? (
                  <div className="space-y-3">
                    {announcements.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-[1.5rem] border border-white/70 bg-slate-50/90 p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-base font-semibold text-slate-950">{item.title}</p>
                            <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-400">
                              {formatDateTime(item.createdAt)}
                            </p>
                          </div>
                          <StatusBadge
                            label="Platform-wide"
                            tone="border-blue-200 bg-blue-50 text-blue-800"
                          />
                        </div>
                        <p className="mt-3 text-sm leading-6 text-slate-600">{item.message}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState title="No updates yet" description="Broadcast notices you send will appear here." />
                )}
              </SectionCard>
            </div>
          </TabsContent>
        </Tabs>

        <Button
          type="button"
          onClick={() => setVerifyModalOpen(true)}
          className="brand-cta fixed right-5 bottom-24 z-40 h-14 w-14 rounded-full border-0 shadow-[0_20px_45px_-24px_rgba(37,99,235,0.65)] lg:right-6 lg:bottom-6"
          aria-label="Verify pass"
        >
          <Plus className="h-6 w-6" />
        </Button>

        <Dialog open={verifyModalOpen} onOpenChange={handleVerifyModalChange}>
          <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto rounded-[1.75rem] border-slate-200 p-0">
            <div className="space-y-6 bg-white p-6">
              <DialogHeader className="pr-10">
                <DialogTitle className="text-2xl text-slate-950">Verify pass</DialogTitle>
                <DialogDescription className="text-sm leading-6 text-slate-600">
                  Scan the student&apos;s QR code, upload a QR image, or enter the 7-digit pass ID manually.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="grid gap-2 sm:grid-cols-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleScanModeChange('scan')}
                    className={`h-11 rounded-full ${
                      verifyMode === 'scan'
                        ? 'border-blue-300 bg-blue-50 text-blue-900'
                        : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Camera className="mr-2 h-4 w-4" />
                    Scan QR
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleScanModeChange('upload')}
                    className={`h-11 rounded-full ${
                      verifyMode === 'upload'
                        ? 'border-blue-300 bg-blue-50 text-blue-900'
                        : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Upload image
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleScanModeChange('manual')}
                    className={`h-11 rounded-full ${
                      verifyMode === 'manual'
                        ? 'border-blue-300 bg-blue-50 text-blue-900'
                        : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Keyboard className="mr-2 h-4 w-4" />
                    Enter ID
                  </Button>
                </div>

                {verifyMode === 'scan' ? (
                  <div className="space-y-3 rounded-[1.5rem] border border-slate-200 bg-slate-50/80 p-4">
                    <div className="overflow-hidden rounded-[1.25rem] border border-slate-200 bg-slate-950">
                      <video
                        ref={videoRef}
                        className="aspect-video w-full object-cover"
                        autoPlay
                        muted
                        playsInline
                      />
                    </div>
                    <p className="text-sm text-slate-600">{scannerStatus}</p>
                    {!scannerAvailable ? (
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                        Try upload image or manual entry on this device.
                      </p>
                    ) : null}
                  </div>
                ) : null}

                {verifyMode === 'upload' ? (
                  <div className="space-y-3 rounded-[1.5rem] border border-slate-200 bg-slate-50/80 p-4">
                    <label className="text-sm font-medium text-slate-700">QR image</label>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(event) => void handleUploadQrImage(event)}
                      className="h-12 rounded-[1.25rem] border-slate-200 bg-white/85 file:mr-4 file:border-0 file:bg-transparent file:text-sm file:font-medium"
                    />
                    <p className="text-sm text-slate-600">
                      Upload a screenshot or saved QR image from the student dashboard.
                    </p>
                    {uploadStatus ? (
                      <p className="text-sm text-slate-600">{uploadStatus}</p>
                    ) : null}
                  </div>
                ) : null}

                <div className="space-y-3">
                  <label className="text-sm font-medium text-slate-700">Pass ID</label>
                  <Input
                    placeholder="e.g. 4839201"
                    value={passCodeInput}
                    onChange={(event) => setPassCodeInput(event.target.value)}
                    onKeyDown={(event) => event.key === 'Enter' && void handleVerifyPass()}
                    className="h-14 rounded-[1.25rem] border-slate-200 bg-white/85 text-center font-mono text-lg tracking-[0.25em]"
                    autoFocus={verifyMode === 'manual'}
                  />
                  <Button
                    onClick={() => void handleVerifyPass()}
                    disabled={!passCodeInput.trim() || isVerifying}
                    className="brand-cta h-12 w-full rounded-full border-0"
                  >
                    {isVerifying ? 'Checking pass...' : 'Verify pass'}
                  </Button>
                </div>
              </div>

              {verificationResult ? (
                <div className="space-y-5">
                  <div className="brand-panel-soft rounded-[1.5rem] border p-5">
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
                            Verification status
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
                        <DetailBlock label="Pass ID" value={getPassCodeLabel(verificationResult.pass, passCodeInput.trim())} />
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
                        <DetailBlock label="Status" value={verificationResult.pass.actualReturnDate ? 'Returned' : verificationResult.pass.status} />
                        <DetailBlock label="Departure" value={formatDateTime(verificationResult.pass.departureDate)} />
                        <DetailBlock label="Return" value={formatDateTime(verificationResult.pass.expectedReturnDate)} />
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
                      No approved pass was found for that pass ID.
                    </div>
                  )}
                </div>
              ) : null}
              <canvas ref={canvasRef} className="hidden" />
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardShell>
  );
}
