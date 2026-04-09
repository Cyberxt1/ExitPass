'use client';

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, LogOut, User } from 'lucide-react';

import { NotificationCenter } from '@/components/notification-center';
import { ThemeToggle } from '@/components/theme-toggle';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/lib/auth-context';
import { apiService } from '@/lib/api-service';
import { Button } from '@/components/ui/button';
import { getRoleLabel } from '@/lib/platform';
import type { Notification } from '@/lib/types';

interface DashboardHeaderProps {
  title: string;
}

export function DashboardHeader({ title }: DashboardHeaderProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationModalOpen, setNotificationModalOpen] = useState(false);

  useEffect(() => {
    if (!user?.id) {
      setNotifications([]);
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const nextNotifications = await apiService.getUserNotifications(user.id);

        if (!cancelled) {
          setNotifications(nextNotifications);
        }
      } catch {
        if (!cancelled) {
          setNotifications([]);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  useEffect(() => {
    if (!notificationModalOpen) {
      return;
    }

    const unreadIds = notifications.filter((notification) => !notification.read).map((notification) => notification.id);

    if (!unreadIds.length) {
      return;
    }

    void apiService.markNotificationsRead(unreadIds).then(() => {
      setNotifications((current) =>
        current.map((notification) =>
          unreadIds.includes(notification.id)
            ? { ...notification, read: true }
            : notification,
        ),
      );
    }).catch(() => undefined);
  }, [notificationModalOpen, notifications]);

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.read).length,
    [notifications],
  );

  const handleLogout = () => {
    void logout().finally(() => {
      navigate('/login');
    });
  };

  return (
    <header className="sticky top-0 z-40 border-b border-blue-100/70 bg-white/82 backdrop-blur-xl dark:border-white/10 dark:bg-[#071221]/80 lg:fixed lg:inset-x-0 lg:top-0 lg:z-50">
      <div className="mx-auto flex h-[4.5rem] max-w-[1800px] items-center justify-between gap-3 px-3 sm:px-4 lg:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <div className="min-w-0">
            <p className="truncate text-lg font-semibold text-slate-950 dark:text-[#eef5ff] sm:text-xl">{title}</p>
            <p className="truncate text-xs uppercase tracking-[0.24em] text-slate-500 dark:text-[#9eb6d3]">
              {getRoleLabel(user?.role)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <ThemeToggle className="border-blue-100/70 bg-white/80 text-slate-700 hover:bg-white dark:border-white/10 dark:bg-white/[0.06] dark:text-[#d7e7fb] dark:hover:bg-white/[0.12]" />

          {user?.role !== 'student' ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setNotificationModalOpen(true)}
              className={`rounded-full border text-slate-700 hover:bg-white hover:text-slate-950 dark:border-white/10 dark:bg-white/[0.06] dark:text-[#d7e7fb] dark:hover:bg-white/[0.12] dark:hover:text-white ${
                unreadCount > 0
                  ? 'border-emerald-200 bg-emerald-100 text-emerald-700'
                  : 'border-white/80 bg-white/80'
              }`}
            >
              <Bell className="w-4 h-4" />
              <span className="hidden sm:inline ml-2">
                {unreadCount > 0 ? `Alerts ${unreadCount}` : 'Alerts'}
              </span>
            </Button>
          ) : null}

          <div className="hidden items-center gap-3 rounded-full border border-white/80 bg-white/80 px-3 py-2 shadow-[0_16px_40px_-28px_rgba(15,23,42,0.45)] dark:border-white/10 dark:bg-white/[0.06] dark:shadow-[0_24px_60px_-36px_rgba(0,0,0,0.88)] sm:flex">
            {user?.photo && (
              <img
                src={user.photo}
                alt={user.name}
                className="w-8 h-8 rounded-full object-cover"
              />
            )}
            <div className="text-right">
              <p className="text-sm font-medium text-slate-950 dark:text-[#eef5ff]">{user?.name}</p>
              <p className="text-xs text-slate-500 dark:text-[#9eb6d3]">{getRoleLabel(user?.role)}</p>
            </div>
          </div>

          {!user?.photo && (
            <div className="hidden h-10 w-10 items-center justify-center rounded-full border border-white/80 bg-white/80 text-slate-700 dark:border-white/10 dark:bg-white/[0.06] dark:text-[#d7e7fb] sm:flex">
              <User className="h-4 w-4" />
            </div>
          )}

          {user?.role === 'student' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setNotificationModalOpen(true)}
              className={`rounded-full border text-slate-700 hover:bg-white hover:text-slate-950 dark:border-white/10 dark:bg-white/[0.06] dark:text-[#d7e7fb] dark:hover:bg-white/[0.12] dark:hover:text-white ${
                unreadCount > 0
                  ? 'border-emerald-200 bg-emerald-100 text-emerald-700'
                  : 'border-white/80 bg-white/80'
              }`}
            >
              <User className="w-4 h-4" />
              <span className="hidden sm:inline ml-2">Alerts</span>
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="rounded-full border border-white/80 bg-white/80 text-slate-700 hover:bg-white hover:text-slate-950 dark:border-white/10 dark:bg-white/[0.06] dark:text-[#d7e7fb] dark:hover:bg-white/[0.12] dark:hover:text-white"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline ml-2">Logout</span>
          </Button>
        </div>
      </div>

      <Dialog open={notificationModalOpen} onOpenChange={setNotificationModalOpen}>
        <DialogContent className="max-h-[88vh] w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] overflow-hidden rounded-[1.25rem] border-slate-200 p-0 sm:max-w-xl">
          <div className="bg-white">
            <div className="border-b border-slate-200 px-4 py-4 sm:px-5">
              <DialogHeader className="pr-8">
                <DialogTitle className="text-lg text-slate-950">Notifications</DialogTitle>
                <DialogDescription className="hidden">Recent account and pass updates.</DialogDescription>
              </DialogHeader>
            </div>
            <div className="space-y-4 px-4 py-4 sm:px-5">
              <NotificationCenter
                notifications={notifications}
                emptyLabel="No notifications yet."
                className="h-[24rem]"
              />
              {user?.role === 'student' ? (
                <Button
                  variant="outline"
                  onClick={() => {
                    setNotificationModalOpen(false);
                    navigate('/dashboard/profile');
                  }}
                  className="w-full rounded-full border-slate-300 bg-white text-slate-900 hover:bg-slate-50"
                >
                  Open profile
                </Button>
              ) : null}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </header>
  );
}
