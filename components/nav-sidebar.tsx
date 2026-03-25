'use client';

import { usePathname, useRouter } from 'next/navigation';
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
    label: 'My Passes',
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
    label: 'Operations Hub',
    href: '/admin-dashboard',
    icon: <ShieldCheck className="w-5 h-5" />,
    roles: ['hall_admin', 'chaplaincy', 'security', 'super_admin'],
  },
  {
    label: 'QR Scanner',
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
  const pathname = usePathname();
  const router = useRouter();

  const availableItems = navItems.filter((item) => item.roles.includes(user?.role || ''));

  const handleLogout = () => {
    void logout().finally(() => {
      router.push('/login');
    });
  };

  return (
    <nav className="flex h-full flex-col gap-4 p-4">
      <div className="rounded-[1.75rem] border border-white/70 bg-[linear-gradient(135deg,rgba(255,122,24,0.12),rgba(89,179,255,0.08),rgba(255,255,255,0.92))] p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
              ExitPass
            </p>
            <p className="mt-2 text-lg font-semibold text-slate-950">{getRoleLabel(user?.role)}</p>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              {user?.name || 'Signed in user'}
            </p>
          </div>
          <div className="rounded-2xl border border-white/80 bg-white/80 p-3 text-slate-900">
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
                  ? 'bg-[linear-gradient(135deg,#ff7a18,#ff477e)] text-white shadow-[0_20px_40px_-24px_rgba(255,71,126,0.85)] hover:opacity-95'
                  : 'text-slate-700 hover:bg-white/85 hover:text-slate-950',
              )}
              onClick={() => {
                router.push(item.href);
                onItemClick?.();
              }}
            >
              {item.icon}
              <span>{item.label}</span>
            </Button>
          );
        })}
      </div>

      <div className="rounded-[1.5rem] border border-white/70 bg-white/76 p-4 text-sm text-slate-600">
        <p className="font-semibold text-slate-900">Always live</p>
        <p className="mt-2 leading-6">
          Requests, approvals, and scans stay in one shared flow so each role sees the same truth.
        </p>
      </div>

      <Button
        variant="ghost"
        className="w-full justify-start gap-3 rounded-[1.25rem] px-4 py-6 text-base text-slate-500 hover:bg-white/85 hover:text-slate-950"
        onClick={handleLogout}
      >
        <LogOut className="w-5 h-5" />
        <span>Logout</span>
      </Button>
    </nav>
  );
}
