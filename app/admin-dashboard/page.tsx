'use client';

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart3,
  CheckCircle2,
  Copy,
  Eye,
  KeyRound,
  Loader2,
  Plus,
  Send,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users,
  XCircle,
} from 'lucide-react';

import { DashboardShell } from '@/components/dashboard-shell';
import { MetricCard, PageHero, StatusBadge } from '@/components/platform-ui';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { apiService } from '@/lib/api-service';
import { useAuth } from '@/lib/auth-context';
import { getDefaultRouteForRole, isAdminRole } from '@/lib/firebase/auth';
import { formatDateTime, getPassStatusMeta, getPassTypeLabel, getRoleLabel } from '@/lib/platform';
import {
  FACULTY_OPTIONS,
  LEVEL_OPTIONS,
  ROOM_FORMAT_HINT,
  getDepartmentsForFaculty,
  isValidDepartmentForFaculty,
  isValidRoom,
  normalizeFaculty,
  normalizeRoom,
  parseStudentLevel,
} from '@/lib/student-profile';
import { getPortalForRole } from '@/lib/staff-portals';
import type {
  AnalyticsSummary,
  Announcement,
  CreateAdminInput,
  CreateStaffInviteInput,
  Holiday,
  Hostel,
  PassRequest,
  StaffInvite,
  StudentSignupInput,
  StudentDetails,
  User,
} from '@/lib/types';

type TabId = 'governance' | 'approvals' | 'students' | 'staff' | 'updates' | 'analytics';

const TAB_LABELS: Record<TabId, string> = {
  governance: 'Governance',
  approvals: 'Approvals',
  students: 'Students',
  staff: 'Staff',
  updates: 'Updates',
  analytics: 'Stats',
};

function getDefaultTab(role?: User['role'] | null): TabId {
  if (role === 'super_admin') {
    return 'governance';
  }

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
      return 'Review requests and manage chaplaincy actions.';
    case 'hall_admin':
      return 'Approve hostel requests and review student records.';
    case 'security':
      return 'Manage staff access and gate operations.';
    case 'super_admin':
      return 'Manage staff, hostels, holiday booking windows, updates, and platform activity.';
    default:
      return 'Manage platform operations.';
  }
}

function getStageLabel(request: PassRequest) {
  if (request.status === 'rejected') {
    return 'Rejected';
  }

  if (request.status === 'approved' || request.currentStage === 'completed') {
    return 'Completed';
  }

  if (
    request.currentStage === 'chaplaincy' ||
    request.status === 'chaplaincy_required' ||
    !request.chaplainApproval
  ) {
    return 'Chaplaincy review';
  }

  if (request.currentStage === 'hall_admin' || request.status === 'pending') {
    return 'Hall admin review';
  }

  return 'In review';
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

type StudentAccountFormState = Omit<StudentSignupInput, 'level'> & {
  level: string;
};

type StudentFilterState = {
  search: string;
  hostel: string;
  room: string;
  faculty: string;
  department: string;
  level: string;
};

const INITIAL_STUDENT_FORM: StudentAccountFormState = {
  name: '',
  email: '',
  matric: '',
  department: '',
  faculty: '',
  level: '',
  hostel: '',
  room: '',
  phone: '',
  guardianPhone: '',
  password: '',
};

function todayDate() {
  return new Date().toISOString().split('T')[0];
}

const INITIAL_STUDENT_FILTERS: StudentFilterState = {
  search: '',
  hostel: 'all',
  room: 'all',
  faculty: 'all',
  department: 'all',
  level: 'all',
};

function getUniqueValues(values: Array<string | number | undefined>) {
  return [...new Set(values.filter((value): value is string | number => Boolean(value)))].sort((left, right) =>
    String(left).localeCompare(String(right)),
  );
}

export default function AdminDashboardPage() {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabId>('approvals');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [pendingStaffApprovals, setPendingStaffApprovals] = useState<User[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PassRequest[]>([]);
  const [students, setStudents] = useState<User[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<PassRequest | null>(null);
  const [selectedRequestStudent, setSelectedRequestStudent] = useState<StudentDetails | null>(null);
  const [selectedRequestStudentError, setSelectedRequestStudentError] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<StudentDetails | null>(null);
  const [admins, setAdmins] = useState<User[]>([]);
  const [hostels, setHostels] = useState<Hostel[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [invites, setInvites] = useState<StaffInvite[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [createdInviteUrl, setCreatedInviteUrl] = useState('');
  const [hostelName, setHostelName] = useState('');
  const [holidayForm, setHolidayForm] = useState({
    title: '',
    description: '',
    departureDate: todayDate(),
    expectedReturnDate: todayDate(),
  });
  const [announcement, setAnnouncement] = useState({ title: '', message: '' });
  const [inviteForm, setInviteForm] = useState<CreateStaffInviteInput>({
    email: '',
    name: '',
    role: 'hall_admin',
    hostelId: '',
  });
  const [staffAccountForm, setStaffAccountForm] = useState<{
    name: string;
    email: string;
    role: Exclude<CreateAdminInput['role'], 'student' | 'super_admin'>;
    hostel: string;
  }>({
    name: '',
    email: '',
    role: 'hall_admin',
    hostel: '',
  });
  const [studentAccountForm, setStudentAccountForm] = useState<StudentAccountFormState>(INITIAL_STUDENT_FORM);
  const [reviewRemarks, setReviewRemarks] = useState<Record<string, string>>({});
  const [staffApprovalReasons, setStaffApprovalReasons] = useState<Record<string, string>>({});
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [studentsLoading, setStudentsLoading] = useState(true);
  const [selectedRequestStudentLoading, setSelectedRequestStudentLoading] = useState(false);
  const [staffLoading, setStaffLoading] = useState(true);
  const [governanceLoading, setGovernanceLoading] = useState(true);
  const [announcementsLoading, setAnnouncementsLoading] = useState(true);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState('');
  const [actionError, setActionError] = useState('');
  const [studentFilters, setStudentFilters] = useState<StudentFilterState>(INITIAL_STUDENT_FILTERS);

  const canManageApprovals = ['hall_admin', 'chaplaincy'].includes(user?.role || '');
  const canManageStudents = ['hall_admin', 'super_admin'].includes(user?.role || '');
  const canManageStaff = ['chaplaincy', 'security', 'super_admin'].includes(user?.role || '');
  const canManageGovernance = user?.role === 'super_admin';
  const canManageHostels = user?.role === 'super_admin';
  const canSendUpdates = ['hall_admin', 'chaplaincy', 'super_admin'].includes(user?.role || '');
  const canViewAnalytics = ['hall_admin', 'chaplaincy', 'security', 'super_admin'].includes(user?.role || '');

  const availableTabs = useMemo<TabId[]>(() => {
    const nextTabs: TabId[] = [];
    if (canManageGovernance) nextTabs.push('governance');
    if (canManageApprovals) nextTabs.push('approvals');
    if (canManageStudents) nextTabs.push('students');
    if (canManageStaff) nextTabs.push('staff');
    if (canSendUpdates) nextTabs.push('updates');
    if (canViewAnalytics) nextTabs.push('analytics');
    return nextTabs;
  }, [
    canManageApprovals,
    canManageGovernance,
    canManageStaff,
    canManageStudents,
    canSendUpdates,
    canViewAnalytics,
  ]);

  const inviteOptions = useMemo(() => getAllowedInviteRoles(user?.role), [user?.role]);
  const studentDepartmentOptions = useMemo(
    () => getDepartmentsForFaculty(studentAccountForm.faculty),
    [studentAccountForm.faculty],
  );
  const studentHostelOptions = useMemo(
    () => getUniqueValues(students.map((student) => student.hostel)),
    [students],
  );
  const studentRoomOptions = useMemo(
    () => getUniqueValues(students.map((student) => student.room)),
    [students],
  );
  const studentFacultyFilterOptions = useMemo(
    () => getUniqueValues(students.map((student) => student.faculty)),
    [students],
  );
  const studentDepartmentFilterOptions = useMemo(
    () => getUniqueValues(students.map((student) => student.department)),
    [students],
  );
  const studentLevelFilterOptions = useMemo(
    () => getUniqueValues(students.map((student) => student.level)),
    [students],
  );
  const filteredStudents = useMemo(() => {
    const searchTerm = studentFilters.search.trim().toLowerCase();

    return students.filter((student) => {
      const searchableText = [
        student.name,
        student.email,
        student.matric,
        student.hostel,
        student.room,
        student.department,
        student.faculty,
        student.level ? String(student.level) : '',
      ]
        .join(' ')
        .toLowerCase();

      if (searchTerm && !searchableText.includes(searchTerm)) {
        return false;
      }

      if (studentFilters.hostel !== 'all' && student.hostel !== studentFilters.hostel) {
        return false;
      }

      if (studentFilters.room !== 'all' && student.room !== studentFilters.room) {
        return false;
      }

      if (studentFilters.faculty !== 'all' && student.faculty !== studentFilters.faculty) {
        return false;
      }

      if (studentFilters.department !== 'all' && student.department !== studentFilters.department) {
        return false;
      }

      if (studentFilters.level !== 'all' && String(student.level || '') !== studentFilters.level) {
        return false;
      }

      return true;
    });
  }, [studentFilters, students]);
  const hallAdminStatsRows = useMemo(
    () =>
      analytics
        ? [
            { label: 'Students in hostel', value: analytics.totalStudents, detail: 'Visible student records' },
            { label: 'Requests submitted', value: analytics.totalRequests, detail: 'All requests in your queue scope' },
            { label: 'Pending reviews', value: analytics.pendingCount, detail: 'Still waiting for a final outcome' },
            { label: 'Approved passes', value: analytics.approvedCount, detail: 'Requests that reached approval' },
            { label: 'Rejected requests', value: analytics.rejectedCount, detail: 'Requests denied in the flow' },
            { label: 'Active passes', value: analytics.activePassesCount, detail: 'Students currently out with a live pass' },
          ]
        : [],
    [analytics],
  );

  useEffect(() => {
    if (!isLoading && !isAdminRole(user?.role)) {
      navigate(getDefaultRouteForRole(user?.role));
    }
  }, [isLoading, navigate, user?.role]);

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

    if (activeTab === 'governance') void loadGovernance();
    if (activeTab === 'approvals') void loadRequests();
    if (activeTab === 'students') void loadStudents();
    if (activeTab === 'staff') void loadStaff();
    if (activeTab === 'updates') void loadAnnouncements();
    if (activeTab === 'analytics') void loadAnalytics();
  }, [activeTab]);

  useEffect(() => {
    if (user?.role && canManageStudents) {
      void loadStudents();
    }
  }, [canManageStudents, user?.role]);

  useEffect(() => {
    if (user?.role && canViewAnalytics) {
      void loadAnalytics();
    }
  }, [canViewAnalytics, user?.role]);

  useEffect(() => {
    if (!selectedRequest?.studentId) {
      setSelectedRequestStudent(null);
      setSelectedRequestStudentError('');
      setSelectedRequestStudentLoading(false);
      return;
    }

    let cancelled = false;

    void (async () => {
      setSelectedRequestStudentLoading(true);
      setSelectedRequestStudentError('');

      try {
        const details = await apiService.getStudentDetails(selectedRequest.studentId);

        if (!cancelled) {
          setSelectedRequestStudent(details);
        }
      } catch (error) {
        if (!cancelled) {
          setSelectedRequestStudent(null);
          setSelectedRequestStudentError(
            error instanceof Error ? error.message : 'Unable to load student history.',
          );
        }
      } finally {
        if (!cancelled) {
          setSelectedRequestStudentLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedRequest?.id, selectedRequest?.studentId]);

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
      const [nextAdmins, nextHostels, nextInvites, nextHolidays] = await Promise.all([
        apiService.getAdmins(),
        apiService.getHostels(),
        apiService.getStaffInvites(),
        apiService.getHolidays(),
      ]);
      setAdmins(nextAdmins);
      setHostels(nextHostels);
      setInvites(nextInvites);
      setHolidays(nextHolidays);
    } finally {
      setStaffLoading(false);
    }
  };

  const loadGovernance = async () => {
    setGovernanceLoading(true);
    try {
      const [nextPendingStaff, nextAdmins, nextStudents, nextHostels, nextInvites, nextHolidays] = await Promise.all([
        apiService.getPendingStaffApprovals(),
        apiService.getAdmins(),
        apiService.getAllStudents(),
        apiService.getHostels(),
        apiService.getStaffInvites(),
        apiService.getHolidays(),
      ]);
      setPendingStaffApprovals(nextPendingStaff);
      setAdmins(nextAdmins);
      setStudents(nextStudents);
      setHostels(nextHostels);
      setInvites(nextInvites);
      setHolidays(nextHolidays);
    } finally {
      setGovernanceLoading(false);
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
    const remarks = reviewRemarks[requestId]?.trim() || '';
    setProcessingId(requestId);
    await withActionFeedback(async () => {
      await apiService.approvePassRequest(requestId, remarks);
      setReviewRemarks((current) => ({ ...current, [requestId]: '' }));
      if (selectedRequest?.id === requestId) {
        setSelectedRequest(null);
      }
      await loadRequests();
    }, user?.role === 'chaplaincy' ? 'Request moved to hall admin.' : 'Request approved successfully.');
    setProcessingId(null);
  };

  const handleReject = async (requestId: string) => {
    const reason = reviewRemarks[requestId]?.trim();

    if (!reason) {
      setActionError('Add remarks before denying this request.');
      return;
    }

    setProcessingId(requestId);
    await withActionFeedback(async () => {
      await apiService.rejectPassRequest(requestId, reason);
      setReviewRemarks((current) => ({ ...current, [requestId]: '' }));
      if (selectedRequest?.id === requestId) {
        setSelectedRequest(null);
      }
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

  const handleCreateHoliday = async () => {
    if (!holidayForm.title.trim()) {
      setActionError('Add a holiday title before saving.');
      return;
    }

    await withActionFeedback(async () => {
      await apiService.createHoliday({
        title: holidayForm.title,
        description: holidayForm.description,
        departureDate: new Date(`${holidayForm.departureDate}T08:00:00`),
        expectedReturnDate: new Date(`${holidayForm.expectedReturnDate}T18:00:00`),
      });
      setHolidayForm({
        title: '',
        description: '',
        departureDate: todayDate(),
        expectedReturnDate: todayDate(),
      });
      await loadStaff();
    }, 'Holiday booking window created.');
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

  const refreshSuperAdminCollections = async () => {
    if (user?.role === 'super_admin') {
      await loadGovernance();
      return;
    }

    await Promise.all([loadStaff(), loadStudents()]);
  };

  const handleApproveStaffAccount = async (userId: string) => {
    setProcessingId(userId);
    await withActionFeedback(async () => {
      await apiService.approveStaffAccount(userId);
      setStaffApprovalReasons((current) => ({ ...current, [userId]: '' }));
      await refreshSuperAdminCollections();
    }, 'Staff account approved.');
    setProcessingId(null);
  };

  const handleRejectStaffAccount = async (userId: string) => {
    const reason = staffApprovalReasons[userId]?.trim();

    if (!reason) {
      setActionError('Add a reason before rejecting this staff account.');
      return;
    }

    setProcessingId(userId);
    await withActionFeedback(async () => {
      await apiService.rejectStaffAccount(userId, reason);
      setStaffApprovalReasons((current) => ({ ...current, [userId]: '' }));
      await refreshSuperAdminCollections();
    }, 'Staff account rejected.');
    setProcessingId(null);
  };

  const handleCreateStaffAccount = async () => {
    if (!staffAccountForm.name.trim() || !staffAccountForm.email.trim()) {
      return;
    }

    if (staffAccountForm.role === 'hall_admin' && !staffAccountForm.hostel) {
      setActionError('Pick a hostel before creating a hall admin account.');
      return;
    }

    clearNotices();

    try {
      const created = await apiService.addAdmin({
        name: staffAccountForm.name.trim(),
        email: staffAccountForm.email.trim(),
        role: staffAccountForm.role,
        hostel: staffAccountForm.role === 'hall_admin' ? staffAccountForm.hostel : '',
      });

      setStaffAccountForm({
        name: '',
        email: '',
        role: 'hall_admin',
        hostel: '',
      });
      await refreshSuperAdminCollections();
      setActionMessage(
        `Staff account created for ${created.user.email}. Temporary password: ${created.temporaryPassword}`,
      );
      setActionError('');
    } catch (error) {
      setActionMessage('');
      setActionError(error instanceof Error ? error.message : 'Unable to create the staff account.');
    }
  };

  const handleCreateStudentAccount = async () => {
    const requiredValues = [
      studentAccountForm.name,
      studentAccountForm.email,
      studentAccountForm.matric,
      studentAccountForm.department,
      studentAccountForm.faculty,
      studentAccountForm.level,
      studentAccountForm.hostel,
      studentAccountForm.room,
      studentAccountForm.phone,
      studentAccountForm.guardianPhone,
      studentAccountForm.password,
    ];

    if (requiredValues.some((value) => !value.trim())) {
      setActionError('Complete every student account field before creating the account.');
      return;
    }

    const selectedLevel = parseStudentLevel(studentAccountForm.level);

    if (!selectedLevel) {
      setActionError('Select a valid level between 100 and 500.');
      return;
    }

    if (!isValidDepartmentForFaculty(studentAccountForm.faculty, studentAccountForm.department)) {
      setActionError('Select a department that matches the chosen faculty.');
      return;
    }

    if (!hostels.some((hostel) => hostel.name === studentAccountForm.hostel)) {
      setActionError('Select a hostel created by the super admin.');
      return;
    }

    if (!isValidRoom(studentAccountForm.room)) {
      setActionError('Room number must be a letter A to L followed by a number from 1 to 25.');
      return;
    }

    await withActionFeedback(async () => {
      await apiService.createStudentAccessAccount({
        ...studentAccountForm,
        name: studentAccountForm.name.trim(),
        email: studentAccountForm.email.trim(),
        matric: studentAccountForm.matric.trim(),
        department: studentAccountForm.department.trim(),
        faculty: normalizeFaculty(studentAccountForm.faculty),
        level: selectedLevel,
        hostel: studentAccountForm.hostel.trim(),
        room: normalizeRoom(studentAccountForm.room),
        phone: studentAccountForm.phone.trim(),
        guardianPhone: studentAccountForm.guardianPhone.trim(),
        password: studentAccountForm.password,
      });
      setStudentAccountForm(INITIAL_STUDENT_FORM);
      await refreshSuperAdminCollections();
    }, 'Student account created.');
  };

  const handleDeleteUser = async (userId: string) => {
    setProcessingId(userId);
    await withActionFeedback(async () => {
      await apiService.deleteUserAccount(userId);
      if (selectedStudent?.id === userId) {
        setSelectedStudent(null);
      }
      await refreshSuperAdminCollections();
    }, 'User account disabled.');
    setProcessingId(null);
  };

  const handleResetUserPassword = async (targetUser: User) => {
    setProcessingId(targetUser.id);
    clearNotices();

    try {
      await apiService.sendUserPasswordReset(targetUser.email);
      setActionMessage(`Password reset link sent to ${targetUser.email}.`);
      setActionError('');
    } catch (error) {
      setActionMessage('');
      setActionError(error instanceof Error ? error.message : 'Unable to send the reset link.');
    } finally {
      setProcessingId(null);
    }
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
              label={canManageApprovals ? 'Pending queue' : 'Pending staff'}
              value={
                canManageApprovals
                  ? requestsLoading
                    ? '...'
                    : pendingRequests.length
                  : governanceLoading
                    ? '...'
                    : pendingStaffApprovals.length
              }
              icon={CheckCircle2}
            />
            <MetricCard
              label="Students"
              value={studentsLoading ? '...' : students.length}
              icon={Users}
              accentClassName="brand-icon-chip"
            />
            <MetricCard
              label="Staff"
              value={staffLoading ? '...' : admins.length}
              icon={ShieldCheck}
              accentClassName="brand-icon-chip"
            />
            <MetricCard
              label="Active passes"
              value={analyticsLoading ? '...' : analytics?.activePassesCount ?? 0}
              icon={BarChart3}
              accentClassName="brand-icon-chip"
            />
          </div>
        </PageHero>

        {actionMessage ? (
          <div className="rounded-[1.5rem] border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
            {actionMessage}
          </div>
        ) : null}
        {actionError ? (
          <div className="rounded-[1.5rem] border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700">
            {actionError}
          </div>
        ) : null}

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TabId)} className="w-full">
        <TabsList className="brand-panel mb-8 grid h-auto w-full gap-2 rounded-[1.5rem] border p-2 sm:grid-cols-3 lg:grid-cols-6">
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

        <TabsContent value="governance" className="space-y-6">
          <SectionIntro
            title="Super admin governance"
            description="Approve newly created staff accounts, create managed users, and keep platform access under control."
          />

          {governanceLoading ? (
            <LoadingCard label="Loading governance tools..." />
          ) : (
            <>
              <Card className="brand-panel border">
                <CardHeader>
                  <CardTitle className="text-lg text-slate-950">Pending staff approvals</CardTitle>
                  <CardDescription className="text-slate-500">
                    New public staff signups stay here until a super admin approves them.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {pendingStaffApprovals.length ? (
                    pendingStaffApprovals.map((account) => (
                      <div key={account.id} className="rounded-[1.5rem] border border-blue-100/80 bg-white/80 p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-base font-semibold text-slate-950">{account.name}</p>
                            <p className="text-sm text-slate-500">
                              {account.email} â€¢ {getRoleLabel(account.role)}
                              {account.hostel ? ` â€¢ ${account.hostel}` : ''}
                            </p>
                            <p className="mt-1 text-xs uppercase tracking-[0.24em] text-slate-400">
                              Requested {formatDateTime(account.createdAt)}
                            </p>
                          </div>
                          <StatusBadge
                            label={account.approvalStatus === 'pending' ? 'Pending review' : 'Reviewed'}
                            tone="border-blue-200 bg-blue-50 text-blue-800"
                          />
                        </div>
                        <Textarea
                          value={staffApprovalReasons[account.id] || ''}
                          onChange={(event) =>
                            setStaffApprovalReasons((current) => ({
                              ...current,
                              [account.id]: event.target.value,
                            }))
                          }
                          placeholder="Add a rejection reason if you want to deny this account..."
                          rows={3}
                          className="mt-4 rounded-[1.25rem] border-slate-200 bg-white/85"
                        />
                        <div className="mt-4 flex flex-wrap gap-2">
                          <Button
                            onClick={() => handleApproveStaffAccount(account.id)}
                            disabled={processingId === account.id}
                            className="brand-cta rounded-full border-0"
                          >
                            {processingId === account.id ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <CheckCircle2 className="mr-2 h-4 w-4" />
                            )}
                            Approve account
                          </Button>
                          <Button
                            variant="outline"
                            className="rounded-full border-slate-300 bg-white/80 text-slate-900 hover:bg-white"
                            disabled={processingId === account.id || !staffApprovalReasons[account.id]?.trim()}
                            onClick={() => handleRejectStaffAccount(account.id)}
                          >
                            <XCircle className="mr-2 h-4 w-4" />
                            Reject account
                          </Button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500">No staff accounts are waiting for approval right now.</p>
                  )}
                </CardContent>
              </Card>

              <div className="grid gap-6 xl:grid-cols-2">
                <Card className="brand-panel border">
                  <CardHeader>
                    <CardTitle className="text-lg text-slate-950">Create staff account</CardTitle>
                    <CardDescription className="text-slate-500">
                      Create a staff account directly and hand over the temporary password.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-4 md:grid-cols-2">
                    <Field label="Full name">
                      <Input
                        value={staffAccountForm.name}
                        onChange={(event) =>
                          setStaffAccountForm((current) => ({ ...current, name: event.target.value }))
                        }
                        placeholder="Enter full name"
                        className="border-slate-200 bg-white/85"
                      />
                    </Field>
                    <Field label="Email">
                      <Input
                        type="email"
                        value={staffAccountForm.email}
                        onChange={(event) =>
                          setStaffAccountForm((current) => ({ ...current, email: event.target.value }))
                        }
                        placeholder="staff@school.edu"
                        className="border-slate-200 bg-white/85"
                      />
                    </Field>
                    <Field label="Role">
                      <select
                        value={staffAccountForm.role}
                        onChange={(event) =>
                          setStaffAccountForm((current) => ({
                            ...current,
                            role: event.target.value as Exclude<CreateAdminInput['role'], 'student' | 'super_admin'>,
                            hostel: event.target.value === 'hall_admin' ? current.hostel : '',
                          }))
                        }
                        className="flex h-10 w-full rounded-xl border border-slate-200 bg-white/85 px-3 py-2 text-sm text-slate-950"
                      >
                        <option value="hall_admin">Hall Admin</option>
                        <option value="chaplaincy">Chaplaincy</option>
                        <option value="security">Security</option>
                      </select>
                    </Field>
                    <Field label="Hostel">
                      <select
                        value={staffAccountForm.hostel}
                        onChange={(event) =>
                          setStaffAccountForm((current) => ({ ...current, hostel: event.target.value }))
                        }
                        disabled={staffAccountForm.role !== 'hall_admin'}
                        className="flex h-10 w-full rounded-xl border border-slate-200 bg-white/85 px-3 py-2 text-sm text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <option value="">Select hostel</option>
                        {hostels.map((hostel) => (
                          <option key={hostel.id} value={hostel.name}>
                            {hostel.name}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <div className="md:col-span-2">
                      <Button onClick={handleCreateStaffAccount} className="brand-cta h-11 w-full rounded-full border-0">
                        <UserPlus className="mr-2 h-4 w-4" />
                        Create staff account
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card className="brand-panel border">
                  <CardHeader>
                    <CardTitle className="text-lg text-slate-950">Create student account</CardTitle>
                    <CardDescription className="text-slate-500">
                      Add a student directly when onboarding needs to be handled by the platform team.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-4 md:grid-cols-2">
                    <Field label="Full name">
                      <Input
                        value={studentAccountForm.name}
                        onChange={(event) =>
                          setStudentAccountForm((current) => ({ ...current, name: event.target.value }))
                        }
                        placeholder="Student name"
                        className="border-slate-200 bg-white/85"
                      />
                    </Field>
                    <Field label="Email">
                      <Input
                        type="email"
                        value={studentAccountForm.email}
                        onChange={(event) =>
                          setStudentAccountForm((current) => ({ ...current, email: event.target.value }))
                        }
                        placeholder="student@school.edu"
                        className="border-slate-200 bg-white/85"
                      />
                    </Field>
                    <Field label="Matric">
                      <Input
                        value={studentAccountForm.matric}
                        onChange={(event) =>
                          setStudentAccountForm((current) => ({ ...current, matric: event.target.value }))
                        }
                        placeholder="12/3456"
                        className="border-slate-200 bg-white/85"
                      />
                    </Field>
                    <Field label="Level">
                      <select
                        value={studentAccountForm.level}
                        onChange={(event) =>
                          setStudentAccountForm((current) => ({ ...current, level: event.target.value }))
                        }
                        className="flex h-10 w-full rounded-xl border border-slate-200 bg-white/85 px-3 py-2 text-sm text-slate-950"
                      >
                        <option value="">Select level</option>
                        {LEVEL_OPTIONS.map((level) => (
                          <option key={level} value={String(level)}>
                            {level}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Faculty">
                      <select
                        value={studentAccountForm.faculty}
                        onChange={(event) =>
                          setStudentAccountForm((current) => {
                            const faculty = normalizeFaculty(event.target.value);
                            const nextDepartments = getDepartmentsForFaculty(faculty);

                            return {
                              ...current,
                              faculty,
                              department: nextDepartments.includes(current.department)
                                ? current.department
                                : '',
                            };
                          })
                        }
                        className="flex h-10 w-full rounded-xl border border-slate-200 bg-white/85 px-3 py-2 text-sm text-slate-950"
                      >
                        <option value="">Select faculty</option>
                        {FACULTY_OPTIONS.map((faculty) => (
                          <option key={faculty.value} value={faculty.value}>
                            {faculty.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Department">
                      <select
                        value={studentAccountForm.department}
                        onChange={(event) =>
                          setStudentAccountForm((current) => ({ ...current, department: event.target.value }))
                        }
                        className="flex h-10 w-full rounded-xl border border-slate-200 bg-white/85 px-3 py-2 text-sm text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={!studentDepartmentOptions.length}
                      >
                        <option value="">
                          {studentDepartmentOptions.length ? 'Select department' : 'Select faculty first'}
                        </option>
                        {studentDepartmentOptions.map((department) => (
                          <option key={department} value={department}>
                            {department}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Hostel">
                      <select
                        value={studentAccountForm.hostel}
                        onChange={(event) =>
                          setStudentAccountForm((current) => ({ ...current, hostel: event.target.value }))
                        }
                        className="flex h-10 w-full rounded-xl border border-slate-200 bg-white/85 px-3 py-2 text-sm text-slate-950"
                      >
                        <option value="">Select hostel</option>
                        {hostels.map((hostel) => (
                          <option key={hostel.id} value={hostel.name}>
                            {hostel.name}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Room">
                      <Input
                        value={studentAccountForm.room}
                        onChange={(event) =>
                          setStudentAccountForm((current) => ({ ...current, room: normalizeRoom(event.target.value) }))
                        }
                        placeholder="A21"
                        className="border-slate-200 bg-white/85"
                      />
                      <p className="text-xs text-slate-500">{ROOM_FORMAT_HINT}</p>
                    </Field>
                    <Field label="Phone">
                      <Input
                        value={studentAccountForm.phone}
                        onChange={(event) =>
                          setStudentAccountForm((current) => ({ ...current, phone: event.target.value }))
                        }
                        placeholder="Phone number"
                        className="border-slate-200 bg-white/85"
                      />
                    </Field>
                    <Field label="Guardian phone">
                      <Input
                        value={studentAccountForm.guardianPhone}
                        onChange={(event) =>
                          setStudentAccountForm((current) => ({
                            ...current,
                            guardianPhone: event.target.value,
                          }))
                        }
                        placeholder="Guardian phone"
                        className="border-slate-200 bg-white/85"
                      />
                    </Field>
                    <Field label="Password">
                      <Input
                        type="password"
                        value={studentAccountForm.password}
                        onChange={(event) =>
                          setStudentAccountForm((current) => ({ ...current, password: event.target.value }))
                        }
                        placeholder="Minimum 8 characters"
                        className="border-slate-200 bg-white/85"
                      />
                    </Field>
                    <div className="md:col-span-2">
                      <Button onClick={handleCreateStudentAccount} className="brand-cta h-11 w-full rounded-full border-0">
                        <UserPlus className="mr-2 h-4 w-4" />
                        Create student account
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="approvals" className="space-y-4">
          <SectionIntro
            title="Pass approvals"
            description={
              user?.role === 'chaplaincy'
                ? 'Review requests first and forward approved records to hall admin.'
                : user?.role === 'hall_admin'
                  ? 'Give the final hostel decision and add remarks for the student.'
                  : 'Review approval queues.'
            }
          />
          {requestsLoading ? (
            <LoadingCard label="Loading requests..." />
          ) : pendingRequests.length === 0 ? (
            <EmptyCard title="No requests waiting" />
          ) : (
            <>
              <Card className="brand-panel border">
                <CardHeader>
                  <CardTitle className="text-lg text-slate-950">Waiting requests</CardTitle>
                  <CardDescription className="text-slate-500">
                    Open a request only when you need full details and actions.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {pendingRequests.map((request) => (
                    <button
                      key={request.id}
                      type="button"
                      onClick={() => setSelectedRequest(request)}
                      className="flex w-full flex-col gap-3 rounded-[1.35rem] border border-blue-100/80 bg-white/80 px-4 py-4 text-left transition hover:border-slate-300 hover:bg-white sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-base font-semibold text-slate-950">
                          {request.student?.name || 'Unknown student'}
                        </p>
                        <p className="truncate text-sm text-slate-500">
                          {request.student?.matric || 'No matric'}{request.student?.hostel ? ` • ${request.student.hostel}` : ''}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
                        <span>{request.destination}</span>
                        <span>•</span>
                        <span>{formatDateTime(request.departureDate)}</span>
                        <StatusBadge
                          label={getStageLabel(request)}
                          tone="border-blue-200 bg-blue-50 text-blue-800"
                        />
                      </div>
                    </button>
                  ))}
                </CardContent>
              </Card>

              <Dialog open={Boolean(selectedRequest)} onOpenChange={(open) => !open && setSelectedRequest(null)}>
                <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto rounded-[1.75rem] border-slate-200 p-0">
                  {selectedRequest ? (
                    <div className="space-y-6 p-6">
                      <DialogHeader className="pr-10">
                        <DialogTitle className="text-2xl text-slate-950">
                          {selectedRequest.student?.name || 'Unknown student'}
                        </DialogTitle>
                        <DialogDescription className="text-sm leading-6 text-slate-600">
                          Review this request and move it forward without crowding the queue view.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge
                          label={getStageLabel(selectedRequest)}
                          tone="border-blue-200 bg-blue-50 text-blue-800"
                        />
                        <StatusBadge
                          label={selectedRequest.student?.hostel || 'No hostel'}
                          tone="border-slate-200 bg-slate-100 text-slate-700"
                        />
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        <InfoBlock label="Matric" value={selectedRequest.student?.matric || 'Not set'} />
                        <InfoBlock label="Destination" value={selectedRequest.destination} />
                        <InfoBlock label="Type" value={selectedRequest.type} />
                        <InfoBlock label="Departure" value={formatDateTime(selectedRequest.departureDate)} />
                        <InfoBlock label="Return" value={formatDateTime(selectedRequest.expectedReturnDate)} />
                        <InfoBlock label="Submitted" value={formatDateTime(selectedRequest.createdAt)} />
                      </div>
                      <InfoBlock label="Reason" value={selectedRequest.reason} />
                      {selectedRequest.chaplainApproval?.reason ? (
                        <InfoBlock label="Chaplaincy remarks" value={selectedRequest.chaplainApproval.reason} />
                      ) : null}
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <h3 className="text-lg font-semibold text-slate-950">Student pass history</h3>
                          {selectedRequestStudent ? (
                            <span className="text-sm text-slate-500">
                              {selectedRequestStudent.totalRequests || 0} requests • {selectedRequestStudent.approvedPasses || 0} approved
                            </span>
                          ) : null}
                        </div>
                        {selectedRequestStudentLoading ? (
                          <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50/80 p-4 text-sm text-slate-500">
                            Loading student history...
                          </div>
                        ) : selectedRequestStudentError ? (
                          <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50/80 p-4 text-sm text-slate-600">
                            {selectedRequestStudentError}
                          </div>
                        ) : selectedRequestStudent ? (
                          <>
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                              <InfoBlock label="Department" value={selectedRequestStudent.department || 'Not set'} />
                              <InfoBlock label="Level" value={selectedRequestStudent.level ? String(selectedRequestStudent.level) : 'Not set'} />
                              <InfoBlock label="Room" value={selectedRequestStudent.room || 'Not set'} />
                              <InfoBlock label="Phone" value={selectedRequestStudent.phone || 'Not set'} />
                            </div>
                            {selectedRequestStudent.passHistory.length ? (
                              <div className="space-y-2">
                                {selectedRequestStudent.passHistory.map((pass) => (
                                  <div
                                    key={pass.id}
                                    className="flex flex-col gap-3 rounded-[1.25rem] border border-blue-100/80 bg-white/80 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                                  >
                                    <div>
                                      <p className="font-medium text-slate-950">{pass.destination}</p>
                                      <p className="text-sm text-slate-500">
                                        {getPassTypeLabel(pass.type)} • {formatDateTime(pass.createdAt)}
                                      </p>
                                    </div>
                                    <StatusBadge
                                      label={getPassStatusMeta(pass).label}
                                      tone={`${getPassStatusMeta(pass).surface} ${getPassStatusMeta(pass).tone}`}
                                    />
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-slate-500">No pass history yet.</p>
                            )}
                          </>
                        ) : (
                          <p className="text-sm text-slate-500">No student history is available for this request yet.</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Remarks</label>
                        <Textarea
                          value={reviewRemarks[selectedRequest.id] || ''}
                          onChange={(event) =>
                            setReviewRemarks((current) => ({ ...current, [selectedRequest.id]: event.target.value }))
                          }
                          placeholder="Add remarks for the student. These remarks are included on approval or denial."
                          rows={4}
                          className="rounded-[1.25rem] border-slate-200 bg-white/85"
                        />
                      </div>
                      <div className="flex flex-col gap-3 sm:flex-row">
                        <Button
                          onClick={() => handleApprove(selectedRequest.id)}
                          disabled={processingId === selectedRequest.id}
                          className="brand-cta rounded-full border-0"
                        >
                          {processingId === selectedRequest.id ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                          )}
                          {user?.role === 'chaplaincy' ? 'Approve and send to hall admin' : 'Approve'}
                        </Button>
                        <Button
                          variant="outline"
                          className="rounded-full border-slate-300 bg-white/80 text-slate-900 hover:bg-white"
                          disabled={processingId === selectedRequest.id || !reviewRemarks[selectedRequest.id]?.trim()}
                          onClick={() => handleReject(selectedRequest.id)}
                        >
                          <XCircle className="mr-2 h-4 w-4" />
                          Deny
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </DialogContent>
              </Dialog>
            </>
          )}
        </TabsContent>

        <TabsContent value="students" className="space-y-4">
          <SectionIntro
            title="Students"
            description={
              user?.role === 'super_admin'
                ? 'Search across the full student directory and open any student record.'
                : 'Review students assigned to your hostel and open their full pass history.'
            }
          />
          {studentsLoading ? (
            <LoadingCard label="Loading students..." />
          ) : (
            <>
              <Card className="brand-panel border">
                <CardHeader>
                  <CardTitle className="text-lg text-slate-950">Student directory</CardTitle>
                  <CardDescription className="text-slate-500">
                    Filter by hostel, room, faculty, department, level, or a general search term.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
                    <Input
                      value={studentFilters.search}
                      onChange={(event) =>
                        setStudentFilters((current) => ({ ...current, search: event.target.value }))
                      }
                      placeholder="Search name, matric, room..."
                      className="border-slate-200 bg-white/85 xl:col-span-2"
                    />
                    {user?.role === 'super_admin' ? (
                      <select
                        value={studentFilters.hostel}
                        onChange={(event) =>
                          setStudentFilters((current) => ({ ...current, hostel: event.target.value }))
                        }
                        className="h-10 rounded-xl border border-slate-200 bg-white/85 px-3 text-sm text-slate-700"
                      >
                        <option value="all">All hostels</option>
                        {studentHostelOptions.map((hostel) => (
                          <option key={hostel} value={String(hostel)}>
                            {hostel}
                          </option>
                        ))}
                      </select>
                    ) : null}
                    <select
                      value={studentFilters.room}
                      onChange={(event) =>
                        setStudentFilters((current) => ({ ...current, room: event.target.value }))
                      }
                      className="h-10 rounded-xl border border-slate-200 bg-white/85 px-3 text-sm text-slate-700"
                    >
                      <option value="all">All rooms</option>
                      {studentRoomOptions.map((room) => (
                        <option key={room} value={String(room)}>
                          {room}
                        </option>
                      ))}
                    </select>
                    <select
                      value={studentFilters.faculty}
                      onChange={(event) =>
                        setStudentFilters((current) => ({ ...current, faculty: event.target.value }))
                      }
                      className="h-10 rounded-xl border border-slate-200 bg-white/85 px-3 text-sm text-slate-700"
                    >
                      <option value="all">All faculties</option>
                      {studentFacultyFilterOptions.map((faculty) => (
                        <option key={faculty} value={String(faculty)}>
                          {faculty}
                        </option>
                      ))}
                    </select>
                    <select
                      value={studentFilters.department}
                      onChange={(event) =>
                        setStudentFilters((current) => ({ ...current, department: event.target.value }))
                      }
                      className="h-10 rounded-xl border border-slate-200 bg-white/85 px-3 text-sm text-slate-700"
                    >
                      <option value="all">All departments</option>
                      {studentDepartmentFilterOptions.map((department) => (
                        <option key={department} value={String(department)}>
                          {department}
                        </option>
                      ))}
                    </select>
                    <select
                      value={studentFilters.level}
                      onChange={(event) =>
                        setStudentFilters((current) => ({ ...current, level: event.target.value }))
                      }
                      className="h-10 rounded-xl border border-slate-200 bg-white/85 px-3 text-sm text-slate-700"
                    >
                      <option value="all">All levels</option>
                      {studentLevelFilterOptions.map((level) => (
                        <option key={level} value={String(level)}>
                          {level} level
                        </option>
                      ))}
                    </select>
                  </div>

                  {filteredStudents.length ? (
                    <div className="overflow-hidden rounded-[1.5rem] border border-blue-100/80 bg-white/80">
                      <Table>
                        <TableHeader>
                          <TableRow className="hover:bg-transparent">
                            <TableHead>Name</TableHead>
                            <TableHead>Matric</TableHead>
                            <TableHead>Hostel</TableHead>
                            <TableHead>Room</TableHead>
                            <TableHead>Department</TableHead>
                            <TableHead>Level</TableHead>
                            <TableHead className="text-right">Action</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredStudents.map((student) => (
                            <TableRow key={student.id} className="bg-transparent">
                              <TableCell>
                                <div>
                                  <p className="font-medium text-slate-950">{student.name}</p>
                                  <p className="text-xs text-slate-500">{student.email}</p>
                                </div>
                              </TableCell>
                              <TableCell>{student.matric || 'Not set'}</TableCell>
                              <TableCell>{student.hostel || 'Not set'}</TableCell>
                              <TableCell>{student.room || 'Not set'}</TableCell>
                              <TableCell>{student.department || 'Not set'}</TableCell>
                              <TableCell>{student.level ? `${student.level}` : 'Not set'}</TableCell>
                              <TableCell className="text-right">
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() => void handleViewStudent(student.id)}
                                  className="rounded-full border-white/80 bg-white/80 text-slate-700 hover:bg-white"
                                >
                                  <Eye className="mr-2 h-4 w-4" />
                                  Open
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50/80 p-6 text-sm text-slate-500">
                      No students match the current filters.
                    </div>
                  )}
                </CardContent>
              </Card>

              <Dialog open={Boolean(selectedStudent)} onOpenChange={(open) => !open && setSelectedStudent(null)}>
                <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto rounded-[1.75rem] border-slate-200 p-0">
                  {selectedStudent ? (
                    <div className="space-y-6 p-6">
                      <DialogHeader className="pr-10">
                        <DialogTitle className="text-2xl text-slate-950">{selectedStudent.name}</DialogTitle>
                        <DialogDescription className="text-sm leading-6 text-slate-600">
                          {selectedStudent.matric}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        <InfoBlock label="Faculty" value={selectedStudent.faculty || 'Not set'} />
                        <InfoBlock label="Department" value={selectedStudent.department || 'Not set'} />
                        <InfoBlock label="Level" value={selectedStudent.level ? String(selectedStudent.level) : 'Not set'} />
                        <InfoBlock label="Hostel" value={selectedStudent.hostel || 'Not set'} />
                        <InfoBlock label="Room / Hostel No." value={selectedStudent.room || 'Not set'} />
                        <InfoBlock label="Phone" value={selectedStudent.phone || 'Not set'} />
                        <InfoBlock label="Guardian Phone" value={selectedStudent.guardianPhone || 'Not set'} />
                        <InfoBlock label="Total Requests" value={String(selectedStudent.totalRequests || 0)} />
                        <InfoBlock label="Approved Passes" value={String(selectedStudent.approvedPasses || 0)} />
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-lg font-semibold text-slate-950">Pass history</h3>
                        {selectedStudent.passHistory?.length ? (
                          selectedStudent.passHistory.map((pass) => (
                            <div key={pass.id} className="flex items-center justify-between rounded-[1.25rem] border border-blue-100/80 bg-white/80 px-4 py-3">
                              <div>
                                <p className="font-medium text-slate-950">{pass.destination}</p>
                                <p className="text-sm text-slate-500">
                                  {getPassTypeLabel(pass.type)} • {formatDateTime(pass.createdAt)}
                                </p>
                              </div>
                              <StatusBadge
                                label={getPassStatusMeta(pass).label}
                                tone={`${getPassStatusMeta(pass).surface} ${getPassStatusMeta(pass).tone}`}
                              />
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-slate-500">No pass history yet.</p>
                        )}
                      </div>
                      {user?.role === 'super_admin' ? (
                        <div className="flex flex-col gap-3 sm:flex-row">
                          <Button
                            variant="outline"
                            className="rounded-full border-white/80 bg-white/80 hover:bg-white"
                            disabled={processingId === selectedStudent.id}
                            onClick={() => handleResetUserPassword(selectedStudent)}
                          >
                            <KeyRound className="mr-2 h-4 w-4" />
                            Send reset link
                          </Button>
                          <Button
                            variant="outline"
                            className="rounded-full border-slate-300 bg-white/80 text-slate-900 hover:bg-white"
                            disabled={processingId === selectedStudent.id}
                            onClick={() => handleDeleteUser(selectedStudent.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Disable account
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </DialogContent>
              </Dialog>
            </>
          )}
        </TabsContent>

        <TabsContent value="staff" className="space-y-6">
          <SectionIntro
            title="Staff access"
            description="Manage hostels, invites, and staff accounts."
          />

          {canManageHostels && (
            <Card className="brand-panel border">
              <CardHeader>
                <CardTitle className="text-lg text-slate-950">Hostels</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Input
                    value={hostelName}
                    onChange={(event) => setHostelName(event.target.value)}
                    placeholder="Add a hostel"
                    className="border-slate-200 bg-white/85"
                  />
                  <Button onClick={handleCreateHostel} className="brand-cta rounded-full border-0">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Hostel
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {hostels.map((hostel) => (
                    <span key={hostel.id} className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-sm text-blue-800">
                      {hostel.name}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {canManageHostels && (
            <Card className="brand-panel border">
              <CardHeader>
                <CardTitle className="text-lg text-slate-950">Holiday booking windows</CardTitle>
                <CardDescription className="text-slate-500">
                  Create holiday slots that students can select directly from the request form.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Holiday title">
                    <Input
                      value={holidayForm.title}
                      onChange={(event) => setHolidayForm((current) => ({ ...current, title: event.target.value }))}
                      placeholder="Easter break"
                      className="border-slate-200 bg-white/85"
                    />
                  </Field>
                  <Field label="Description">
                    <Input
                      value={holidayForm.description}
                      onChange={(event) => setHolidayForm((current) => ({ ...current, description: event.target.value }))}
                      placeholder="Campus closes for the mid-semester break."
                      className="border-slate-200 bg-white/85"
                    />
                  </Field>
                  <Field label="Departure date">
                    <Input
                      type="date"
                      value={holidayForm.departureDate}
                      onChange={(event) =>
                        setHolidayForm((current) => ({
                          ...current,
                          departureDate: event.target.value,
                          expectedReturnDate:
                            event.target.value > current.expectedReturnDate
                              ? event.target.value
                              : current.expectedReturnDate,
                        }))
                      }
                      className="border-slate-200 bg-white/85"
                    />
                  </Field>
                  <Field label="Return date">
                    <Input
                      type="date"
                      min={holidayForm.departureDate}
                      value={holidayForm.expectedReturnDate}
                      onChange={(event) =>
                        setHolidayForm((current) => ({ ...current, expectedReturnDate: event.target.value }))
                      }
                      className="border-slate-200 bg-white/85"
                    />
                  </Field>
                </div>

                <Button onClick={handleCreateHoliday} className="brand-cta rounded-full border-0">
                  <Plus className="mr-2 h-4 w-4" />
                  Create holiday window
                </Button>

                <div className="space-y-3">
                  {holidays.length ? (
                    holidays.map((holiday) => (
                      <div key={holiday.id} className="rounded-2xl border border-blue-100/80 bg-white/80 px-4 py-3">
                        <p className="font-medium text-slate-950">{holiday.title}</p>
                        <p className="mt-1 text-sm text-slate-500">{holiday.description || 'No extra description.'}</p>
                        <p className="mt-2 text-xs uppercase tracking-[0.22em] text-slate-400">
                          {formatDateTime(holiday.departureDate)} to {formatDateTime(holiday.expectedReturnDate)}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500">No holiday windows created yet.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {canManageStaff && (
            <Card className="brand-panel border">
              <CardHeader>
                <CardTitle className="text-lg text-slate-950">Create invite link</CardTitle>
                <CardDescription className="text-slate-500">Create a signup link for staff.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <Field label="Name">
                  <Input
                    value={inviteForm.name}
                    onChange={(event) => setInviteForm((current) => ({ ...current, name: event.target.value }))}
                    placeholder="Optional display name"
                    className="border-slate-200 bg-white/85"
                  />
                </Field>
                <Field label="Email">
                  <Input
                    type="email"
                    value={inviteForm.email}
                    onChange={(event) => setInviteForm((current) => ({ ...current, email: event.target.value }))}
                    placeholder="staff@school.edu"
                    className="border-slate-200 bg-white/85"
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
                    className="flex h-10 w-full rounded-xl border border-slate-200 bg-white/85 px-3 py-2 text-sm text-slate-950"
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
                      className="flex h-10 w-full rounded-xl border border-slate-200 bg-white/85 px-3 py-2 text-sm text-slate-950"
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
                  <Button onClick={handleCreateInvite} className="brand-cta h-11 w-full rounded-full border-0">
                    <Send className="mr-2 h-4 w-4" />
                    Create Invite Link
                  </Button>
                </div>
                {createdInviteUrl && (
                  <div className="md:col-span-2 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm">
                    <p className="font-medium text-blue-900">Latest invite link</p>
                    <p className="mt-2 break-all text-blue-800">{createdInviteUrl}</p>
                    <Button variant="outline" className="mt-3 rounded-full border-white/80 bg-white/80 hover:bg-white" onClick={() => handleCopy(createdInviteUrl)}>
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
              <Card className="brand-panel border">
                <CardHeader>
                  <CardTitle className="text-lg text-slate-950">Staff members</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {admins.map((admin) => (
                    <div key={admin.id} className="flex items-center justify-between rounded-2xl border border-blue-100/80 bg-white/80 px-4 py-3">
                      <div>
                        <p className="font-medium text-slate-950">{admin.name}</p>
                        <p className="text-sm text-slate-500">
                          {admin.email} â€¢ {admin.role.replace('_', ' ')}
                        </p>
                      </div>
                      {user?.role === 'super_admin' && user.id !== admin.id && (
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="rounded-full border-white/80 bg-white/80 hover:bg-white"
                            disabled={processingId === admin.id}
                            onClick={() => handleResetUserPassword(admin)}
                          >
                            <KeyRound className="mr-2 h-4 w-4" />
                            Reset link
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="rounded-full hover:bg-slate-100"
                            disabled={processingId === admin.id}
                            onClick={() => handleDeleteUser(admin.id)}
                          >
                            <Trash2 className="h-4 w-4 text-slate-700" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="brand-panel border">
                <CardHeader>
                  <CardTitle className="text-lg text-slate-950">Invite links</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {invites.length ? (
                    invites.map((invite) => {
                      const inviteUrl = buildInviteUrl(invite.id, invite.role);
                      return (
                        <div key={invite.id} className="rounded-2xl border border-blue-100/80 bg-white/80 px-4 py-3">
                          <p className="font-medium text-slate-950">{invite.email}</p>
                          <p className="text-sm text-slate-500">
                            {invite.role.replace('_', ' ')} â€¢ {invite.status}
                            {invite.hostel ? ` â€¢ ${invite.hostel}` : ''}
                          </p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <Button variant="outline" size="sm" className="rounded-full border-white/80 bg-white/80 hover:bg-white" onClick={() => handleCopy(inviteUrl)}>
                              <Copy className="mr-2 h-4 w-4" />
                              Copy link
                            </Button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-sm text-slate-500">No invites created yet.</p>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="updates" className="space-y-4">
          <SectionIntro title="Updates" description="Send announcements." />
          <Card className="brand-panel border">
            <CardContent className="space-y-4 pt-6">
              <Field label="Title">
                <Input
                  value={announcement.title}
                  onChange={(event) => setAnnouncement((current) => ({ ...current, title: event.target.value }))}
                  placeholder="Announcement title"
                  className="border-slate-200 bg-white/85"
                />
              </Field>
              <Field label="Message">
                <Textarea
                  value={announcement.message}
                  onChange={(event) => setAnnouncement((current) => ({ ...current, message: event.target.value }))}
                  placeholder="Write your announcement here..."
                  rows={5}
                  className="rounded-[1.25rem] border-slate-200 bg-white/85"
                />
              </Field>
              <Button onClick={handleSendAnnouncement} className="brand-cta h-11 w-full rounded-full border-0">
                <Send className="mr-2 h-4 w-4" />
                Send announcement
              </Button>
            </CardContent>
          </Card>
          {announcementsLoading ? (
            <LoadingCard label="Loading announcements..." />
          ) : (
            announcements.map((item) => (
              <Card key={item.id} className="brand-panel border">
                <CardContent className="pt-6">
                  <p className="font-semibold text-slate-950">{item.title}</p>
                  <p className="mt-2 text-sm text-slate-500">{item.message}</p>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <SectionIntro
            title="Analytics"
            description={
              user?.role === 'hall_admin'
                ? 'Hostel-level request and pass totals for the students assigned to you.'
                : 'Pass and request totals.'
            }
          />
          {analyticsLoading ? (
            <LoadingCard label="Loading analytics..." />
          ) : analytics ? (
            <div className="space-y-6">
              {user?.role === 'hall_admin' ? (
                <Card className="brand-panel border">
                  <CardHeader>
                    <CardTitle className="text-lg text-slate-950">Hostel stats table</CardTitle>
                    <CardDescription className="text-slate-500">
                      Summary of students and pass activity within your hostel scope.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead>Metric</TableHead>
                          <TableHead>Detail</TableHead>
                          <TableHead className="text-right">Value</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {hallAdminStatsRows.map((row) => (
                          <TableRow key={row.label} className="bg-transparent">
                            <TableCell className="font-medium text-slate-950">{row.label}</TableCell>
                            <TableCell className="text-slate-500">{row.detail}</TableCell>
                            <TableCell className="text-right text-base font-semibold text-slate-950">
                              {row.value}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                  <StatCard label="Students" value={analytics.totalStudents} color="text-slate-950" />
                  <StatCard label="Requests" value={analytics.totalRequests} color="text-blue-700" />
                  <StatCard label="Approved" value={analytics.approvedCount} color="text-blue-600" />
                  <StatCard label="Pending" value={analytics.pendingCount} color="text-slate-700" />
                  <StatCard label="Rejected" value={analytics.rejectedCount} color="text-slate-500" />
                  <StatCard label="Active Passes" value={analytics.activePassesCount} color="text-blue-500" />
                </div>
              )}
              <Card className="brand-panel border">
                <CardHeader>
                  <CardTitle className="text-lg text-slate-950">Weekly trend</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {analytics.trend.map((row) => (
                    <div key={row.day} className="grid grid-cols-4 rounded-2xl border border-blue-100/80 bg-white/80 px-4 py-3 text-sm">
                      <span className="font-medium text-slate-950">{row.day}</span>
                      <span className="text-slate-700">{row.requests} requests</span>
                      <span className="text-blue-700">{row.approved} approved</span>
                      <span className="text-slate-500">{row.rejected} rejected</span>
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
      <h1 className="text-3xl font-semibold tracking-tight text-slate-950">{title}</h1>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">{description}</p>
    </div>
  );
}

function LoadingCard({ label }: { label: string }) {
  return (
    <Card className="brand-panel border">
      <CardContent className="pt-6">
        <p className="text-center text-slate-500">{label}</p>
      </CardContent>
    </Card>
  );
}

function EmptyCard({ title }: { title: string }) {
  return (
    <Card className="brand-panel border">
      <CardContent className="pt-6">
        <p className="text-center text-slate-500">{title}</p>
      </CardContent>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      {children}
    </div>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="brand-panel-soft rounded-2xl border p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-sm text-slate-900">{value}</p>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <Card className="brand-panel border">
      <CardContent className="pt-6">
        <p className={`text-2xl font-semibold ${color}`}>{value}</p>
        <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-500">{label}</p>
      </CardContent>
    </Card>
  );
}
