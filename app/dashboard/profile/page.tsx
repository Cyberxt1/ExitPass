'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  BookOpen,
  Building2,
  DoorOpen,
  IdCard,
  LogOut,
  Mail,
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
import { useAuth } from '@/lib/auth-context';
import { apiService } from '@/lib/api-service';
import { getRoleLabel } from '@/lib/platform';
import type { Pass } from '@/lib/types';

export default function ProfilePage() {
  const { user, logout, isLoading } = useAuth();
  const router = useRouter();
  const [passes, setPasses] = useState<Pass[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [isLoading, router, user]);

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

  const handleLogout = () => {
    void logout().finally(() => {
      router.push('/login');
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

  return (
    <DashboardShell title="My Profile" contentClassName="mx-auto max-w-7xl">
      <div className="space-y-6">
        <PageHero
          eyebrow="Account center"
          title={user.name}
          description={`${getRoleLabel(user.role)} account. Keep your identity details, access level, and movement history easy to understand.`}
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
              description="Your account access level."
              icon={ShieldCheck}
            />
            <MetricCard
              label="Matric or ID"
              value={user.matric || 'Pending'}
              description="Your platform identity code."
              icon={IdCard}
              accentClassName="bg-[linear-gradient(135deg,rgba(89,179,255,0.22),rgba(255,255,255,0.88))]"
            />
            <MetricCard
              label="Approved"
              value={dataLoading ? '...' : passSummary.approved}
              description="Passes cleared for use."
              icon={BookOpen}
              accentClassName="bg-[linear-gradient(135deg,rgba(51,200,143,0.22),rgba(255,255,255,0.88))]"
            />
            <MetricCard
              label="Open requests"
              value={dataLoading ? '...' : passSummary.pending}
              description="Requests still under review."
              icon={User}
              accentClassName="bg-[linear-gradient(135deg,rgba(255,196,87,0.22),rgba(255,255,255,0.88))]"
            />
          </div>
        </PageHero>

        {dataLoading ? (
          <LoadingPanel label="Loading your profile summary..." />
        ) : (
          <div className="grid gap-6 xl:grid-cols-[1fr_0.92fr]">
            <SectionCard title="Identity" description="Core account details used throughout the platform.">
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
                      label="Room"
                      value={
                        <span className="inline-flex items-center gap-2">
                          <DoorOpen className="h-4 w-4 text-slate-500" />
                          {user.room || 'Not set'}
                        </span>
                      }
                    />
                  </>
                )}
              </div>
            </SectionCard>

            <div className="space-y-6">
              <SectionCard
                title="Access and security"
                description="A quick view of what this account can currently do."
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
                      If you lose access, use the password reset flow instead of creating a new account.
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => router.push('/forgot-password')}
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
                description="Your pass activity at a glance."
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
