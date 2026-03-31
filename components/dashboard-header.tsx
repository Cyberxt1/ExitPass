'use client';

import { useNavigate } from 'react-router-dom';
import { ArrowUpRight, LogOut, User } from 'lucide-react';

import { Link } from '@/components/app-link';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { getRoleLabel } from '@/lib/platform';

interface DashboardHeaderProps {
  title: string;
}

export function DashboardHeader({ title }: DashboardHeaderProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    void logout().finally(() => {
      navigate('/login');
    });
  };

  return (
    <header className="sticky top-0 z-40 border-b border-blue-100/70 bg-white/82 backdrop-blur-xl lg:fixed lg:inset-x-0 lg:top-0 lg:z-50">
      <div className="mx-auto flex h-[4.5rem] max-w-[1800px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <Link href="/" className="hidden items-center gap-3 md:flex">
            <span className="brand-mark inline-flex h-11 w-11 items-center justify-center rounded-2xl text-sm font-semibold text-white">
              EP
            </span>
          </Link>
          <div className="min-w-0">
            <p className="truncate text-lg font-semibold text-slate-950 sm:text-xl">{title}</p>
            <p className="truncate text-xs uppercase tracking-[0.24em] text-slate-500">
              {getRoleLabel(user?.role)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="hidden rounded-full border border-white/80 bg-white/80 text-slate-700 hover:bg-white md:inline-flex"
          >
            <Link href="/">
              Public site
              <ArrowUpRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>

          <div className="hidden items-center gap-3 rounded-full border border-white/80 bg-white/80 px-3 py-2 shadow-[0_16px_40px_-28px_rgba(15,23,42,0.45)] sm:flex">
            {user?.photo && (
              <img
              src={user.photo}
              alt={user.name}
                className="w-8 h-8 rounded-full object-cover"
              />
            )}
            <div className="text-right">
              <p className="text-sm font-medium text-slate-950">{user?.name}</p>
              <p className="text-xs text-slate-500">{getRoleLabel(user?.role)}</p>
            </div>
          </div>

          {!user?.photo && (
            <div className="hidden h-10 w-10 items-center justify-center rounded-full border border-white/80 bg-white/80 text-slate-700 sm:flex">
              <User className="h-4 w-4" />
            </div>
          )}

          {user?.role === 'student' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/dashboard/profile')}
              className="rounded-full border border-white/80 bg-white/80 text-slate-700 hover:bg-white hover:text-slate-950"
            >
              <User className="w-4 h-4" />
              <span className="hidden sm:inline ml-2">Profile</span>
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="rounded-full border border-white/80 bg-white/80 text-slate-700 hover:bg-white hover:text-slate-950"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline ml-2">Logout</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
