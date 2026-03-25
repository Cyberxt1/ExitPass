'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  CheckCircle2,
  History,
  MapPin,
  QrCode,
  User as UserIcon,
} from 'lucide-react';

import { useAuth } from '@/lib/auth-context';
import { apiService } from '@/lib/api-service';
import { DashboardShell } from '@/components/dashboard-shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function SecurityScannerPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [qrInput, setQrInput] = useState('');
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanHistory, setScanHistory] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('scanner');

  useEffect(() => {
    if (!isLoading && user?.role !== 'security') {
      router.push('/dashboard');
    }
  }, [isLoading, router, user?.role]);

  useEffect(() => {
    if (activeTab === 'history') {
      void loadScanHistory();
    }
  }, [activeTab]);

  const loadScanHistory = async () => {
    try {
      const history = await apiService.getScanHistory(20);
      setScanHistory(history);
    } catch (error) {
      console.error('Error loading scan history:', error);
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
          message: 'QR Code not found or invalid',
        });
      }
    } catch (error) {
      setVerificationResult({
        pass: null,
        isValid: false,
        message: 'Error verifying QR code',
      });
    } finally {
      setIsScanning(false);
    }
  };

  const handleClearResult = () => {
    setVerificationResult(null);
    setQrInput('');
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  return (
    <DashboardShell title="Security Scanner" contentClassName="max-w-4xl mx-auto pb-20 lg:pb-8">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 gap-2 mb-8 bg-muted/50 p-1 h-auto">
                <TabsTrigger value="scanner" className="text-xs sm:text-sm">
                  <QrCode className="w-4 h-4 mr-2 hidden sm:inline" />
                  Scanner
                </TabsTrigger>
                <TabsTrigger value="history" className="text-xs sm:text-sm">
                  <History className="w-4 h-4 mr-2 hidden sm:inline" />
                  History
                </TabsTrigger>
              </TabsList>

              <TabsContent value="scanner" className="space-y-6">
                <div className="mb-8">
                  <h1 className="text-3xl font-bold text-foreground mb-2">QR Code Scanner</h1>
                  <p className="text-muted-foreground">Scan or paste student pass QR codes</p>
                </div>

                <Card className="border-border/30 bg-muted/20">
                  <CardHeader>
                    <CardTitle className="text-lg">Scan Pass</CardTitle>
                    <CardDescription>
                      Paste the QR code data or use a barcode scanner to verify passes
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="p-8 border-2 border-dashed border-border/50 rounded-lg text-center bg-background/50">
                      <QrCode className="w-16 h-16 text-primary/30 mx-auto mb-4" />
                      <p className="text-sm text-muted-foreground mb-4">Scan or paste QR code below</p>
                      <Input
                        placeholder="Paste QR code data here..."
                        value={qrInput}
                        onChange={(e) => setQrInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleScan()}
                        className="text-center font-mono text-sm"
                        autoFocus
                      />
                    </div>

                    <Button
                      onClick={handleScan}
                      disabled={!qrInput.trim() || isScanning}
                      className="w-full bg-primary hover:bg-primary/90 h-12"
                      size="lg"
                    >
                      <QrCode className="w-5 h-5 mr-2" />
                      {isScanning ? 'Scanning...' : 'Verify Pass'}
                    </Button>
                  </CardContent>
                </Card>

                {verificationResult && (
                  <Card
                    className={`border-border/30 ${
                      verificationResult.isValid
                        ? 'border-green-500/30 bg-green-50/50 dark:bg-green-950/20'
                        : 'border-red-500/30 bg-red-50/50 dark:bg-red-950/20'
                    }`}
                  >
                    <CardHeader className="space-y-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {verificationResult.isValid ? (
                            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full">
                              <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
                            </div>
                          ) : (
                            <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full">
                              <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
                            </div>
                          )}
                          <div>
                            <CardTitle
                              className={
                                verificationResult.isValid
                                  ? 'text-green-700 dark:text-green-400'
                                  : 'text-red-700 dark:text-red-400'
                              }
                            >
                              {verificationResult.message}
                            </CardTitle>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" onClick={handleClearResult}>
                          X
                        </Button>
                      </div>
                    </CardHeader>

                    {verificationResult.pass && (
                      <CardContent className="space-y-4 border-t border-border/30 mt-4 pt-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">
                              Student Name
                            </p>
                            <p className="font-semibold text-foreground flex items-center gap-2">
                              <UserIcon className="w-4 h-4 text-primary" />
                              {verificationResult.pass.student?.name || 'Unknown'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">
                              Matric No.
                            </p>
                            <p className="font-mono text-foreground">
                              {verificationResult.pass.student?.matric}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">
                              Destination
                            </p>
                            <p className="font-semibold text-foreground flex items-center gap-2">
                              <MapPin className="w-4 h-4 text-primary" />
                              {verificationResult.pass.destination}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">
                              Pass Type
                            </p>
                            <p className="capitalize text-foreground font-semibold">
                              {verificationResult.pass.type}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">
                              Departure
                            </p>
                            <p className="text-sm text-foreground">
                              {new Date(verificationResult.pass.departureDate).toLocaleString()}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">
                              Return
                            </p>
                            <p className="text-sm text-foreground">
                              {new Date(verificationResult.pass.expectedReturnDate).toLocaleString()}
                            </p>
                          </div>
                        </div>

                        <div className="pt-4 border-t border-border/30">
                          {verificationResult.isValid ? (
                            <div className="p-4 bg-green-100/50 dark:bg-green-900/20 border border-green-300/50 dark:border-green-700/50 rounded-lg">
                              <p className="text-sm font-semibold text-green-800 dark:text-green-300">
                                Pass verified and valid. Student may proceed.
                              </p>
                            </div>
                          ) : (
                            <div className="p-4 bg-red-100/50 dark:bg-red-900/20 border border-red-300/50 dark:border-red-700/50 rounded-lg">
                              <p className="text-sm font-semibold text-red-800 dark:text-red-300">
                                Pass is invalid or expired. Entry denied.
                              </p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    )}
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="history" className="space-y-6">
                <div className="mb-8">
                  <h1 className="text-3xl font-bold text-foreground mb-2">Scan History</h1>
                  <p className="text-muted-foreground">Recent pass verifications</p>
                </div>

                {scanHistory.length > 0 ? (
                  <div className="space-y-3">
                    {scanHistory.map((scan) => (
                      <Card key={scan.id} className="border-border/30">
                        <CardContent className="pt-6">
                          <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-5 gap-4 items-center">
                            <div>
                              <p className="text-xs text-muted-foreground uppercase font-semibold">
                                QR Code
                              </p>
                              <p className="font-mono text-xs text-foreground truncate">{scan.qrCode}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground uppercase font-semibold">
                                Location
                              </p>
                              <p className="text-sm text-foreground">{scan.location}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground uppercase font-semibold">Time</p>
                              <p className="text-sm text-foreground">
                                {new Date(scan.timestamp).toLocaleTimeString()}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground uppercase font-semibold">Date</p>
                              <p className="text-sm text-foreground">
                                {new Date(scan.timestamp).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="flex justify-end">
                              <span
                                className={`text-xs px-3 py-1 rounded-full font-semibold ${
                                  scan.status === 'success'
                                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                    : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                                }`}
                              >
                                {scan.status}
                              </span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card className="border-border/30">
                    <CardContent className="pt-6">
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <History className="w-12 h-12 text-muted-foreground/30 mb-3" />
                        <p className="text-muted-foreground text-lg">No scan history yet</p>
                        <p className="text-muted-foreground text-sm mt-1">Scans will appear here</p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
    </DashboardShell>
  );
}
