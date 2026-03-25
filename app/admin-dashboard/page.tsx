'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  BarChart3,
  Bell,
  CheckCircle2,
  Copy,
  Eye,
  Loader2,
  Plus,
  Send,
  ShieldCheck,
  UserPlus,
  Users,
  X,
  XCircle,
} from 'lucide-react';

import { DashboardShell } from '@/components/dashboard-shell';
import { EmptyState, LoadingPanel, MetricCard, PageHero, StatusBadge } from '@/components/platform-ui';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { apiService } from '@/lib/api-service';
import { useAuth } from '@/lib/auth-context';
import { isAdminRole } from '@/lib/firebase/auth';
import { formatDateTime, getRoleLabel } from '@/lib/platform';
import { getPortalForRole } from '@/lib/staff-portals';
import type {
  AnalyticsSummary,
  Announcement,
  CreateStaffInviteInput,
  Hostel,
  PassRequest,
  StaffInvite,
  StudentDetails,
  User,
} from '@/lib/types';

type TabId = 'approvals' | 'students' | 'staff' | 'updates' | 'analytics';

const TAB_LABELS: Record<TabId, string> = {
  approvals: 'Approvals',
  students: 'Students',
  staff: 'Staff',
  updates: 'Updates',
  analytics: 'Stats',
};

function getDefaultTab(role?: User['role'] | null): TabId {
  if (role === 'security') {
    return 'staff';
  }

  return 'approvals';
}

function getWorkspaceTitle(role?: User['role']) {
  switch (role) {
    case 'chaplaincy':
      return 'Chaplaincy Workspace';
    case 'hall_admin':
      return 'Hall Admin Workspace';
    case 'security':
      return 'Security Operations';
    case 'super_admin':
      return 'Platform Operations';
    default:
      return 'Operations Hub';
  }
}

function getWorkspaceDescription(role?: User['role']) {
  switch (role) {
    case 'chaplaincy':
      return 'Review every fresh request first, guide the chaplaincy queue, and keep decisions traceable.';
    case 'hall_admin':
      return 'Handle final hostel approvals, inspect student history, and keep the last decision point clean.';
    case 'security':
      return 'Manage security access and keep gate teams aligned with the live platform.';
    case 'super_admin':
      return 'Oversee staff access, hostels, announcements, and the health of the entire pass system.';
    default:
      return 'Keep the platform moving from one shared workspace.';
  }
}

function getAllowedInviteRoles(role?: User['role']) {
  if (role === 'super_admin') {
    return [
      { value: 'hall_admin', label: 'Hall Admin' },
      { value: 'chaplaincy', label: 'Chapel Staff' },
      { value: 'security', label: 'Security Staff' },
    ];
  }

  if (role === 'chaplaincy') {
    return [{ value: 'chaplaincy', label: 'Chapel Staff' }];
  }

  if (role === 'security') {
    return [{ value: 'security', label: 'Security Staff' }];
  }

  return [];
}

export default function AdminDashboardPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabId>('approvals');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [pendingRequests, setPendingRequests] = useState<PassRequest[]>([]);
  const [students, setStudents] = useState<User[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<StudentDetails | null>(null);
  const [admins, setAdmins] = useState<User[]>([]);
  const [hostels, setHostels] = useState<Hostel[]>([]);
  const [invites, setInvites] = useState<StaffInvite[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [createdInviteUrl, setCreatedInviteUrl] = useState('');
  const [hostelName, setHostelName] = useState('');
  const [announcement, setAnnouncement] = useState({ title: '', message: '' });
  const [inviteForm, setInviteForm] = useState<CreateStaffInviteInput>({
    email: '',
    name: '',
    role: 'hall_admin',
    hostelId: '',
  });
  const [rejectionReasons, setRejectionReasons] = useState<Record<string, string>>({});
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [studentsLoading, setStudentsLoading] = useState(true);
  const [staffLoading, setStaffLoading] = useState(true);
  const [announcementsLoading, setAnnouncementsLoading] = useState(true);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState('');
  const [actionError, setActionError] = useState('');

  const canManageApprovals = ['hall_admin', 'chaplaincy', 'super_admin'].includes(user?.role || '');
  const canManageStudents = canManageApprovals;
  const canManageStaff = ['chaplaincy', 'security', 'super_admin'].includes(user?.role || '');
  const canManageHostels = user?.role === 'super_admin';
  const canSendUpdates = canManageApprovals;
  const canViewAnalytics = ['hall_admin', 'chaplaincy', 'security', 'super_admin'].includes(user?.role || '');

  const availableTabs = useMemo<TabId[]>(() => {
    const nextTabs: TabId[] = [];
    if (canManageApprovals) nextTabs.push('approvals');
    if (canManageStudents) nextTabs.push('students');
    if (canManageStaff) nextTabs.push('staff');
    if (canSendUpdates) nextTabs.push('updates');
    if (canViewAnalytics) nextTabs.push('analytics');
    return nextTabs;
  }, [canManageApprovals, canManageStaff, canManageStudents, canSendUpdates, canViewAnalytics]);

  const inviteOptions = useMemo(() => getAllowedInviteRoles(user?.role), [user?.role]);

  useEffect(() => {
    if (!isLoading && !isAdminRole(user?.role)) {
      router.push('/dashboard');
    }
  }, [isLoading, router, user?.role]);

  useEffect(() => {
    if (!user?.role) {
      return;
    }

    const defaultTab = getDefaultTab(user.role);
    setActiveTab(availableTabs.includes(defaultTab) ? defaultTab : availableTabs[0] || 'approvals');
  }, [availableTabs, user?.role]);

  useEffect(() => {
    if (!inviteOptions.length) {
      return;
    }

    if (!inviteOptions.some((item) => item.value === inviteForm.role)) {
      setInviteForm((current) => ({
        ...current,
        role: inviteOptions[0].value as CreateStaffInviteInput['role'],
        hostelId: '',
      }));
    }
  }, [inviteForm.role, inviteOptions]);

  useEffect(() => {
    if (!activeTab) {
      return;
    }

    if (activeTab === 'approvals') void loadRequests();
    if (activeTab === 'students') void loadStudents();
    if (activeTab === 'staff') void loadStaff();
    if (activeTab === 'updates') void loadAnnouncements();
    if (activeTab === 'analytics') void loadAnalytics();
  }, [activeTab]);

  const buildInviteUrl = (token: string, role: User['role']) => {
    const portal = getPortalForRole(role);

    if (typeof window === 'undefined') {
      return `/${portal}/signup?token=${token}`;
    }

    return `${window.location.origin}/${portal}/signup?token=${token}`;
  };

  const clearNotices = () => {
    setActionMessage('');
    setActionError('');
  };

  const withActionFeedback = async (work: () => Promise<void>, successMessage: string) => {
    clearNotices();

    try {
      await work();
      setActionMessage(successMessage);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'The action could not be completed.');
    }
  };

  const loadRequests = async () => {
    if (!user) return;
    setRequestsLoading(true);
    try {
      setPendingRequests(await apiService.getPendingRequests(user));
    } finally {
      setRequestsLoading(false);
    }
  };

  const loadStudents = async () => {
    setStudentsLoading(true);
    try {
      setStudents(await apiService.getAllStudents());
    } finally {
      setStudentsLoading(false);
    }
  };

  const loadStaff = async () => {
    setStaffLoading(true);
    try {
      const [nextAdmins, nextHostels, nextInvites] = await Promise.all([
        apiService.getAdmins(),
        apiService.getHostels(),
        apiService.getStaffInvites(),
      ]);
      setAdmins(nextAdmins);
      setHostels(nextHostels);
      setInvites(nextInvites);
    } finally {
      setStaffLoading(false);
    }
  };

  const loadAnnouncements = async () => {
    setAnnouncementsLoading(true);
    try {
      setAnnouncements(await apiService.getAnnouncements());
    } finally {
      setAnnouncementsLoading(false);
    }
  };

  const loadAnalytics = async () => {
    setAnalyticsLoading(true);
    try {
      setAnalytics(await apiService.getAnalytics());
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const handleApprove = async (requestId: string) => {
    setProcessingId(requestId);
    await withActionFeedback(async () => {
      await apiService.approvePassRequest(requestId);
      await loadRequests();
    }, 'Request approved successfully.');
    setProcessingId(null);
  };

  const handleReject = async (requestId: string) => {
    const reason = rejectionReasons[requestId]?.trim();

    if (!reason) {
      setActionError('Add a rejection reason before denying this request.');
      return;
    }

    setProcessingId(requestId);
    await withActionFeedback(async () => {
      await apiService.rejectPassRequest(requestId, reason);
      setRejectionReasons((current) => ({ ...current, [requestId]: '' }));
      await loadRequests();
    }, 'Request denied and logged.');
    setProcessingId(null);
  };

  const handleViewStudent = async (studentId: string) => {
    await withActionFeedback(async () => {
      const details = await apiService.getStudentDetails(studentId);
      setSelectedStudent(details);
    }, 'Student record loaded.');
  };

  const handleCreateHostel = async () => {
    if (!hostelName.trim()) return;
    await withActionFeedback(async () => {
      await apiService.createHostel(hostelName.trim());
      setHostelName('');
      await loadStaff();
    }, 'Hostel created.');
  };

  const handleCreateInvite = async () => {
    if (!inviteForm.email.trim()) return;
    await withActionFeedback(async () => {
      const createdInvite = await apiService.createStaffInvite({
        email: inviteForm.email.trim(),
        name: inviteForm.name?.trim(),
        role: inviteForm.role,
        hostelId: inviteForm.role === 'hall_admin' ? inviteForm.hostelId : undefined,
      });
      setCreatedInviteUrl(buildInviteUrl(createdInvite.id, createdInvite.role));
      setInviteForm({
        email: '',
        name: '',
        role: inviteOptions[0]?.value as CreateStaffInviteInput['role'],
        hostelId: '',
      });
      await loadStaff();
    }, 'Invite link created.');
  };

  const handleCopy = async (value: string) => {
    await navigator.clipboard.writeText(value);
    setActionMessage('Copied to clipboard.');
    setActionError('');
  };

  const handleRemoveAdmin = async (adminId: string) => {
    await withActionFeedback(async () => {
      await apiService.removeAdmin(adminId);
      await loadStaff();
    }, 'Staff member removed.');
  };

  const handleSendAnnouncement = async () => {
    if (!announcement.title || !announcement.message) return;
    await withActionFeedback(async () => {
      await apiService.sendAnnouncement(announcement.title.trim(), announcement.message.trim());
      setAnnouncement({ title: '', message: '' });
      await loadAnnouncements();
    }, 'Announcement sent.');
  };

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  return (
    <DashboardShell title={getWorkspaceTitle(user?.role)} contentClassName="mx-auto max-w-7xl pb-20 lg:pb-8">
      <div className="space-y-6">
        <PageHero
          eyebrow={getRoleLabel(user?.role)}
          title={getWorkspaceTitle(user?.role)}
          description={getWorkspaceDescription(user?.role)}
        >
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Pending queue"
              value={requestsLoading ? '...' : pendingRequests.length}
              description="Requests waiting in your approval flow."
              icon={CheckCircle2}
            />
            <MetricCard
              label="Students"
              value={studentsLoading ? '...' : students.length}
              description="Student accounts available for review."
              icon={Users}
              accentClassName="bg-[linear-gradient(135deg,rgba(89,179,255,0.22),rgba(255,255,255,0.88))]"
            />
            <MetricCard
              label="Staff"
              value={staffLoading ? '...' : admins.length}
              description="Active staff profiles on the platform."
              icon={ShieldCheck}
              accentClassName="bg-[linear-gradient(135deg,rgba(51,200,143,0.22),rgba(255,255,255,0.88))]"
            />
            <MetricCard
              label="Active passes"
              value={analyticsLoading ? '...' : analytics?.activePassesCount ?? 0}
              description="Approved passes currently in motion."
              icon={BarChart3}
              accentClassName="bg-[linear-gradient(135deg,rgba(255,196,87,0.22),rgba(255,255,255,0.88))]"
            />
          </div>
        </PageHero>

        {actionMessage ? (
          <div className="rounded-[1.5rem] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {actionMessage}
          </div>
        ) : null}
        {actionError ? (
          <div className="rounded-[1.5rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {actionError}
          </div>
        ) : null}

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TabId)} className="w-full">
        <TabsList className="mb-8 grid h-auto w-full gap-2 rounded-[1.5rem] border border-white/70 bg-white/76 p-2 sm:grid-cols-3 lg:grid-cols-5">
          {availableTabs.map((tab) => (
            <TabsTrigger
              key={tab}
              value={tab}
              className="rounded-[1rem] text-xs data-[state=active]:bg-slate-950 data-[state=active]:text-white sm:text-sm"
            >
              {TAB_LABELS[tab]}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="approvals" className="space-y-4">
          <SectionIntro
            title="Pass approvals"
            description={
              user?.role === 'chaplaincy'
                ? 'Chapel reviews every new request first and can deny with a reason.'
                : user?.role === 'hall_admin'
                  ? 'Only chapel-approved requests for your hostel appear here.'
                  : 'Review chapel-stage and hall-stage approvals across the platform.'
            }
          />
          {requestsLoading ? (
            <LoadingCard label="Loading requests..." />
          ) : pendingRequests.length === 0 ? (
            <EmptyCard title="No requests waiting" />
          ) : (
            <div className="space-y-4">
              {pendingRequests.map((request) => (
                <Card key={request.id} className="border-border/30">
                  <CardContent className="space-y-4 pt-6">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-lg font-semibold text-foreground">{request.student?.name || 'Unknown student'}</p>
                        <p className="text-sm text-muted-foreground">
                          {request.student?.matric} {request.student?.hostel ? `• ${request.student.hostel}` : ''}
                        </p>
                      </div>
                      <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                        {getStageLabel(request)}
                      </span>
                    </div>
                    <div className="grid gap-4 md:grid-cols-3">
                      <InfoBlock label="Destination" value={request.destination} />
                      <InfoBlock label="Departure" value={new Date(request.departureDate).toLocaleString()} />
                      <InfoBlock label="Return" value={new Date(request.expectedReturnDate).toLocaleString()} />
                    </div>
                    <InfoBlock label="Reason" value={request.reason} />
                    <Textarea
                      value={rejectionReasons[request.id] || ''}
                      onChange={(event) =>
                        setRejectionReasons((current) => ({ ...current, [request.id]: event.target.value }))
                      }
                      placeholder="Add a reason if you need to deny this request..."
                      rows={3}
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button
                        onClick={() => handleApprove(request.id)}
                        disabled={processingId === request.id}
                        className="bg-green-600 text-white hover:bg-green-700"
                      >
                        {processingId === request.id ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                        )}
                        Approve
                      </Button>
                      <Button
                        variant="outline"
                        className="border-red-300 text-red-600 hover:bg-red-50"
                        disabled={processingId === request.id || !rejectionReasons[request.id]?.trim()}
                        onClick={() => handleReject(request.id)}
                      >
                        <XCircle className="mr-2 h-4 w-4" />
                        Deny
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="students" className="space-y-4">
          <SectionIntro title="Students" description="View student records and recent pass history." />
          {selectedStudent ? (
            <Card className="border-border/30">
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle>{selectedStudent.name}</CardTitle>
                    <CardDescription>{selectedStudent.matric}</CardDescription>
                  </div>
                  <Button variant="outline" onClick={() => setSelectedStudent(null)}>
                    Back
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <InfoBlock label="Department" value={selectedStudent.department || 'Not set'} />
                  <InfoBlock label="Level" value={selectedStudent.level || 'Not set'} />
                  <InfoBlock label="Hostel" value={selectedStudent.hostel || 'Not set'} />
                  <InfoBlock label="Room" value={selectedStudent.room || 'Not set'} />
                  <InfoBlock label="Total Requests" value={String(selectedStudent.totalRequests || 0)} />
                  <InfoBlock label="Approved Passes" value={String(selectedStudent.approvedPasses || 0)} />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">Pass history</h3>
                  {selectedStudent.passHistory?.length ? (
                    selectedStudent.passHistory.map((pass: any) => (
                      <div key={pass.id} className="rounded-2xl border border-border/30 px-4 py-3">
                        <p className="font-medium">{pass.destination}</p>
                        <p className="text-sm text-muted-foreground">
                          {pass.type} • {pass.status}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No pass history yet.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : studentsLoading ? (
            <LoadingCard label="Loading students..." />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {students.map((student) => (
                <Card key={student.id} className="border-border/30">
                  <CardContent className="space-y-3 pt-6">
                    <div>
                      <p className="font-semibold text-foreground">{student.name}</p>
                      <p className="text-xs text-muted-foreground">{student.matric}</p>
                    </div>
                    <p className="text-sm text-muted-foreground">{student.hostel || 'No hostel set'}</p>
                    <Button variant="outline" className="w-full" onClick={() => handleViewStudent(student.id)}>
                      <Eye className="mr-2 h-4 w-4" />
                      View details
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="staff" className="space-y-6">
          <SectionIntro
            title="Staff access"
            description="Create hostels, generate invite links, and track who has joined the platform."
          />

          {canManageHostels && (
            <Card className="border-border/30 bg-muted/20">
              <CardHeader>
                <CardTitle className="text-lg">Hostels</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Input
                    value={hostelName}
                    onChange={(event) => setHostelName(event.target.value)}
                    placeholder="Add a hostel"
                  />
                  <Button onClick={handleCreateHostel}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Hostel
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {hostels.map((hostel) => (
                    <span key={hostel.id} className="rounded-full bg-primary/10 px-3 py-1 text-sm text-primary">
                      {hostel.name}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {canManageStaff && (
            <Card className="border-border/30 bg-muted/20">
              <CardHeader>
                <CardTitle className="text-lg">Create invite link</CardTitle>
                <CardDescription>Invite new hall admins, chapel staff, or security staff.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <Field label="Name">
                  <Input
                    value={inviteForm.name}
                    onChange={(event) => setInviteForm((current) => ({ ...current, name: event.target.value }))}
                    placeholder="Optional display name"
                  />
                </Field>
                <Field label="Email">
                  <Input
                    type="email"
                    value={inviteForm.email}
                    onChange={(event) => setInviteForm((current) => ({ ...current, email: event.target.value }))}
                    placeholder="staff@school.edu"
                  />
                </Field>
                <Field label="Role">
                  <select
                    value={inviteForm.role}
                    onChange={(event) =>
                      setInviteForm((current) => ({
                        ...current,
                        role: event.target.value as CreateStaffInviteInput['role'],
                      }))
                    }
                    className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  >
                    {getAllowedInviteRoles(user?.role).map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </Field>
                {inviteForm.role === 'hall_admin' && (
                  <Field label="Hostel">
                    <select
                      value={inviteForm.hostelId}
                      onChange={(event) =>
                        setInviteForm((current) => ({ ...current, hostelId: event.target.value }))
                      }
                      className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                    >
                      <option value="">Select hostel</option>
                      {hostels.map((hostel) => (
                        <option key={hostel.id} value={hostel.id}>
                          {hostel.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                )}
                <div className="md:col-span-2">
                  <Button onClick={handleCreateInvite} className="w-full bg-primary hover:bg-primary/90">
                    <Send className="mr-2 h-4 w-4" />
                    Create Invite Link
                  </Button>
                </div>
                {createdInviteUrl && (
                  <div className="md:col-span-2 rounded-2xl border border-emerald-300/50 bg-emerald-50/70 p-4 text-sm">
                    <p className="font-medium text-emerald-900">Latest invite link</p>
                    <p className="mt-2 break-all text-emerald-800">{createdInviteUrl}</p>
                    <Button variant="outline" className="mt-3" onClick={() => handleCopy(createdInviteUrl)}>
                      <Copy className="mr-2 h-4 w-4" />
                      Copy link
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {staffLoading ? (
            <LoadingCard label="Loading staff..." />
          ) : (
            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="border-border/30">
                <CardHeader>
                  <CardTitle className="text-lg">Staff members</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {admins.map((admin) => (
                    <div key={admin.id} className="flex items-center justify-between rounded-2xl border border-border/30 px-4 py-3">
                      <div>
                        <p className="font-medium">{admin.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {admin.email} • {admin.role.replace('_', ' ')}
                        </p>
                      </div>
                      {user?.role === 'super_admin' && user.id !== admin.id && (
                        <Button variant="ghost" size="sm" onClick={() => handleRemoveAdmin(admin.id)}>
                          <X className="h-4 w-4 text-red-600" />
                        </Button>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="border-border/30">
                <CardHeader>
                  <CardTitle className="text-lg">Invite links</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {invites.length ? (
                    invites.map((invite) => {
                      const inviteUrl = buildInviteUrl(invite.id, invite.role);
                      return (
                        <div key={invite.id} className="rounded-2xl border border-border/30 px-4 py-3">
                          <p className="font-medium">{invite.email}</p>
                          <p className="text-sm text-muted-foreground">
                            {invite.role.replace('_', ' ')} • {invite.status}
                            {invite.hostel ? ` • ${invite.hostel}` : ''}
                          </p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <Button variant="outline" size="sm" onClick={() => handleCopy(inviteUrl)}>
                              <Copy className="mr-2 h-4 w-4" />
                              Copy link
                            </Button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-sm text-muted-foreground">No invites created yet.</p>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="updates" className="space-y-4">
          <SectionIntro title="Updates" description="Send announcements to students and staff." />
          <Card className="border-border/30 bg-muted/20">
            <CardContent className="space-y-4 pt-6">
              <Field label="Title">
                <Input
                  value={announcement.title}
                  onChange={(event) => setAnnouncement((current) => ({ ...current, title: event.target.value }))}
                  placeholder="Announcement title"
                />
              </Field>
              <Field label="Message">
                <Textarea
                  value={announcement.message}
                  onChange={(event) => setAnnouncement((current) => ({ ...current, message: event.target.value }))}
                  placeholder="Write your announcement here..."
                  rows={5}
                />
              </Field>
              <Button onClick={handleSendAnnouncement} className="w-full bg-primary hover:bg-primary/90">
                <Send className="mr-2 h-4 w-4" />
                Send announcement
              </Button>
            </CardContent>
          </Card>
          {announcementsLoading ? (
            <LoadingCard label="Loading announcements..." />
          ) : (
            announcements.map((item) => (
              <Card key={item.id} className="border-border/30">
                <CardContent className="pt-6">
                  <p className="font-semibold">{item.title}</p>
                  <p className="mt-2 text-sm text-muted-foreground">{item.message}</p>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <SectionIntro title="Analytics" description="Track request volumes, approvals, and active passes." />
          {analyticsLoading ? (
            <LoadingCard label="Loading analytics..." />
          ) : analytics ? (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                <StatCard label="Students" value={analytics.totalStudents} color="text-primary" />
                <StatCard label="Requests" value={analytics.totalRequests} color="text-blue-600" />
                <StatCard label="Approved" value={analytics.approvedCount} color="text-green-600" />
                <StatCard label="Pending" value={analytics.pendingCount} color="text-yellow-600" />
                <StatCard label="Rejected" value={analytics.rejectedCount} color="text-red-600" />
                <StatCard label="Active Passes" value={analytics.activePassesCount} color="text-purple-600" />
              </div>
              <Card className="border-border/30">
                <CardHeader>
                  <CardTitle className="text-lg">Weekly trend</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {analytics.trend.map((row: any) => (
                    <div key={row.day} className="grid grid-cols-4 rounded-2xl border border-border/20 px-4 py-3 text-sm">
                      <span className="font-medium">{row.day}</span>
                      <span>{row.requests} requests</span>
                      <span className="text-green-600">{row.approved} approved</span>
                      <span className="text-red-600">{row.rejected} rejected</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          ) : null}
        </TabsContent>
      </Tabs>
      </div>
    </DashboardShell>
  );
}

function SectionIntro({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <h1 className="text-3xl font-bold text-foreground">{title}</h1>
      <p className="mt-2 text-muted-foreground">{description}</p>
    </div>
  );
}

function LoadingCard({ label }: { label: string }) {
  return (
    <Card className="border-border/30">
      <CardContent className="pt-6">
        <p className="text-center text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}

function EmptyCard({ title }: { title: string }) {
  return (
    <Card className="border-border/30">
      <CardContent className="pt-6">
        <p className="text-center text-muted-foreground">{title}</p>
      </CardContent>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      {children}
    </div>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-muted/40 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm text-foreground">{value}</p>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <Card className="border-border/30">
      <CardContent className="pt-6">
        <p className={`text-2xl font-bold ${color}`}>{value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}
