'use client';

import { useLocation, useNavigate } from 'react-router-dom';
import {
  ClipboardList,
  Home,
  LogOut,
  QrCode,
  Settings,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { getRoleLabel } from '@/lib/platform';
import { cn } from '@/lib/utils';
import type { UserRole } from '@/lib/types';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  roles: UserRole[];
}

const navItems: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: <Home className="w-5 h-5" />,
    roles: ['student'],
  },
  {
    label: 'Request Pass',
    href: '/dashboard/request',
    icon: <ClipboardList className="w-5 h-5" />,
    roles: ['student'],
  },
  {
    label: 'Passes',
    href: '/dashboard/passes',
    icon: <QrCode className="w-5 h-5" />,
    roles: ['student'],
  },
  {
    label: 'Profile',
    href: '/dashboard/profile',
    icon: <Settings className="w-5 h-5" />,
    roles: ['student'],
  },
  {
    label: 'Operations',
    href: '/admin-dashboard',
    icon: <ShieldCheck className="w-5 h-5" />,
    roles: ['hall_admin', 'chaplaincy', 'security', 'super_admin'],
  },
  {
    label: 'Scanner',
    href: '/security-scanner',
    icon: <QrCode className="w-5 h-5" />,
    roles: ['security'],
  },
];

interface NavSidebarProps {
  onItemClick?: () => void;
}

export function NavSidebar({ onItemClick }: NavSidebarProps) {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const availableItems = navItems.filter((item) => (user ? item.roles.includes(user.role) : false));

  const handleLogout = () => {
    void logout().finally(() => {
      navigate('/login');
    });
  };

  return (
    <nav className="flex h-full flex-col gap-4 p-4">
      <div className="brand-panel rounded-[1.75rem] border p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-[#9eb6d3]">
              ExitPass
            </p>
            <p className="mt-2 text-lg font-semibold text-slate-950 dark:text-[#eef5ff]">{getRoleLabel(user?.role)}</p>
            <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-[#b6c9e0]">
              {user?.name || 'Signed in user'}
            </p>
          </div>
          <div className="brand-icon-chip rounded-2xl border p-3 text-slate-900 dark:text-[#eef5ff]">
            <Sparkles className="h-5 w-5" />
          </div>
        </div>
      </div>

      <div className="space-y-1 flex-1">
        {availableItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Button
              key={item.href}
              variant="ghost"
              className={cn(
                'w-full justify-start gap-3 rounded-[1.25rem] px-4 py-6 text-base',
                isActive
                  ? 'brand-cta hover:opacity-95'
                  : 'text-slate-700 hover:bg-white/85 hover:text-slate-950 dark:text-[#c5d7ee] dark:hover:bg-white/10 dark:hover:text-white',
              )}
              onClick={() => {
                navigate(item.href);
                onItemClick?.();
              }}
            >
              {item.icon}
              <span>{item.label}</span>
            </Button>
          );
        })}
      </div>

      <div className="brand-panel-soft rounded-[1.5rem] border p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-[#9eb6d3]">Status</p>
        <p className="mt-2 text-sm font-medium text-slate-900 dark:text-[#eef5ff]">Live sync</p>
        <p className="mt-1 text-sm text-slate-600 dark:text-[#b6c9e0]">Updates appear here as they happen.</p>
      </div>

      <Button
        variant="ghost"
        className="w-full justify-start gap-3 rounded-[1.25rem] px-4 py-6 text-base text-slate-500 hover:bg-white/85 hover:text-slate-950 dark:text-[#9eb6d3] dark:hover:bg-white/10 dark:hover:text-white"
        onClick={handleLogout}
      >
        <LogOut className="w-5 h-5" />
        <span>Logout</span>
      </Button>
    </nav>
  );
}
