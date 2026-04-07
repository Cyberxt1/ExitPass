'use client';

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  BookOpen,
  Building2,
  CheckCircle2,
  DoorOpen,
  IdCard,
  Loader2,
  LogOut,
  Mail,
  PencilLine,
  Phone,
  ShieldCheck,
  User,
} from 'lucide-react';

import { DashboardShell } from '@/components/dashboard-shell';
import {
  DetailBlock,
  LoadingPanel,
  MetricCard,
  PageHero,
  SectionCard,
  StatusBadge,
} from '@/components/platform-ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/auth-context';
import { apiService } from '@/lib/api-service';
import { getDefaultRouteForRole } from '@/lib/firebase/auth';
import { getRoleLabel } from '@/lib/platform';
import type { Pass } from '@/lib/types';

export default function ProfilePage() {
  const { user, logout, isLoading, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [passes, setPasses] = useState<Pass[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [editableName, setEditableName] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);
  const [nameError, setNameError] = useState('');
  const [nameSuccess, setNameSuccess] = useState('');

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
    if (!user?.id || user.role !== 'student') {
      setDataLoading(false);
      return;
    }

    void apiService
      .getStudentPasses(user.id)
      .then(setPasses)
      .finally(() => setDataLoading(false));
  }, [user?.id, user?.role]);

  useEffect(() => {
    setEditableName(user?.name || '');
  }, [user?.name]);

  const handleLogout = () => {
    void logout().finally(() => {
      navigate('/login');
    });
  };

  const passSummary = useMemo(
    () => ({
      total: passes.length,
      approved: passes.filter((pass) => pass.status === 'approved').length,
      pending: passes.filter((pass) => ['pending', 'chaplaincy_required'].includes(pass.status)).length,
    }),
    [passes],
  );

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  if (!user) {
    return null;
  }

  if (user.role !== 'student') {
    return null;
  }

  const nameChangeCount = user.nameChangeCount ?? 0;
  const remainingNameChanges = Math.max(0, 2 - nameChangeCount);

  const handleSaveName = async (event: React.FormEvent) => {
    event.preventDefault();
    setNameError('');
    setNameSuccess('');

    const trimmedName = editableName.trim();

    if (!trimmedName) {
      setNameError('Name is required.');
      return;
    }

    if (trimmedName === user.name) {
      setNameSuccess('Your name is already up to date.');
      return;
    }

    if (remainingNameChanges <= 0) {
      setNameError('You have already used your 2 allowed name changes.');
      return;
    }

    setIsSavingName(true);

    try {
      await apiService.updateStudentProfile(user.id, { name: trimmedName });
      await refreshUser();
      setNameSuccess('Your name has been updated successfully.');
    } catch (error) {
      setNameError(error instanceof Error ? error.message : 'Unable to update your name.');
    } finally {
      setIsSavingName(false);
    }
  };

  return (
    <DashboardShell title="My Profile" contentClassName="mx-auto max-w-7xl">
      <div className="space-y-6">
        <PageHero
          eyebrow="Profile"
          title={user.name}
          description={`${getRoleLabel(user.role)} account`}
          actions={
            <Button
              onClick={handleLogout}
              className="rounded-full bg-slate-950 text-white hover:bg-slate-800"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          }
        >
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Role"
              value={getRoleLabel(user.role)}
              icon={ShieldCheck}
            />
            <MetricCard
              label="Matric"
              value={user.matric || 'Pending'}
              icon={IdCard}
              accentClassName="brand-icon-chip"
            />
            <MetricCard
              label="Approved"
              value={dataLoading ? '...' : passSummary.approved}
              icon={BookOpen}
              accentClassName="brand-icon-chip"
            />
            <MetricCard
              label="Open requests"
              value={dataLoading ? '...' : passSummary.pending}
              icon={User}
              accentClassName="brand-icon-chip"
            />
          </div>
        </PageHero>

        {dataLoading ? (
          <LoadingPanel label="Loading your profile summary..." />
        ) : (
          <div className="grid gap-6 xl:grid-cols-[1fr_0.92fr]">
            <SectionCard title="Identity" description="Your saved account details.">
              <div className="grid gap-4 md:grid-cols-2">
                <DetailBlock label="Full name" value={user.name} />
                <DetailBlock label="Email address" value={user.email} />
                <DetailBlock label="Matric or ID" value={user.matric || 'Not available'} />
                <DetailBlock label="Role" value={getRoleLabel(user.role)} />
                {user.role === 'student' && (
                  <>
                    <DetailBlock
                      label="Department"
                      value={
                        <span className="inline-flex items-center gap-2">
                          <BookOpen className="h-4 w-4 text-slate-500" />
                          {user.department || 'Not set'}
                        </span>
                      }
                    />
                    <DetailBlock
                      label="Faculty"
                      value={user.faculty || 'Not set'}
                    />
                    <DetailBlock
                      label="Level"
                      value={user.level || 'Not set'}
                    />
                    <DetailBlock
                      label="Hostel"
                      value={
                        <span className="inline-flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-slate-500" />
                          {user.hostel || 'Not set'}
                        </span>
                      }
                    />
                    <DetailBlock
                      label="Room or hostel number"
                      value={
                        <span className="inline-flex items-center gap-2">
                          <DoorOpen className="h-4 w-4 text-slate-500" />
                          {user.room || 'Not set'}
                        </span>
                      }
                    />
                    <DetailBlock
                      label="Phone number"
                      value={
                        <span className="inline-flex items-center gap-2">
                          <Phone className="h-4 w-4 text-slate-500" />
                          {user.phone || 'Not set'}
                        </span>
                      }
                    />
                    <DetailBlock
                      label="Guardian phone"
                      value={user.guardianPhone || 'Not set'}
                    />
                  </>
                )}
              </div>
            </SectionCard>

            <div className="space-y-6">
              <SectionCard
                title="Profile edits"
                description="You can update your name up to 2 times."
              >
                <form onSubmit={handleSaveName} className="space-y-4">
                  <div className="rounded-[1.5rem] border border-white/70 bg-slate-50/90 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                      Name changes used
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-slate-950">
                      {nameChangeCount} / 2
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {remainingNameChanges > 0
                        ? `${remainingNameChanges} change${remainingNameChanges === 1 ? '' : 's'} remaining.`
                        : 'You have reached the maximum number of name changes.'}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Full name</label>
                    <Input
                      value={editableName}
                      onChange={(event) => setEditableName(event.target.value)}
                      className="h-12 rounded-2xl border-slate-200 bg-white/80"
                      disabled={isSavingName || remainingNameChanges <= 0}
                    />
                  </div>

                  {nameError ? (
                    <div className="flex gap-3 rounded-[1.25rem] border border-rose-200 bg-rose-50 p-4">
                      <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-rose-600" />
                      <p className="text-sm leading-6 text-rose-700">{nameError}</p>
                    </div>
                  ) : null}

                  {nameSuccess ? (
                    <div className="flex gap-3 rounded-[1.25rem] border border-emerald-200 bg-emerald-50 p-4">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-600" />
                      <p className="text-sm leading-6 text-emerald-700">{nameSuccess}</p>
                    </div>
                  ) : null}

                  <Button
                    type="submit"
                    disabled={
                      isSavingName ||
                      remainingNameChanges <= 0 ||
                      editableName.trim().length === 0 ||
                      editableName.trim() === user.name
                    }
                    className="rounded-full bg-slate-950 text-white hover:bg-slate-800"
                  >
                    {isSavingName ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <PencilLine className="mr-2 h-4 w-4" />
                        Save name
                      </>
                    )}
                  </Button>
                </form>
              </SectionCard>

              <SectionCard
                title="Access"
                description="Current account access."
              >
                <div className="space-y-4">
                  <div className="rounded-[1.5rem] border border-white/70 bg-slate-50/90 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                      Permissions
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {(user.permissions?.length ? user.permissions : ['basic_access']).map((permission) => (
                        <StatusBadge
                          key={permission}
                          label={permission.replace(/_/g, ' ')}
                          tone="border-slate-200 bg-white text-slate-700"
                        />
                      ))}
                    </div>
                  </div>

                  <div className="rounded-[1.5rem] border border-white/70 bg-slate-50/90 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                      Password support
                    </p>
                    <p className="mt-2 text-sm leading-7 text-slate-600">
                      Reset your password if you lose access.
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => navigate('/forgot-password')}
                      className="mt-4 rounded-full border-white/80 bg-white/80 text-slate-900 hover:bg-white"
                    >
                      <Mail className="mr-2 h-4 w-4" />
                      Reset password
                    </Button>
                  </div>
                </div>
              </SectionCard>

              <SectionCard
                title="Movement summary"
                description="Pass totals."
              >
                <div className="grid gap-3">
                  <DetailBlock label="Total records" value={passSummary.total} />
                  <DetailBlock label="Approved passes" value={passSummary.approved} />
                  <DetailBlock label="Pending review" value={passSummary.pending} />
                </div>
              </SectionCard>
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
