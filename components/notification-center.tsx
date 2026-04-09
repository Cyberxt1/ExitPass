'use client';

import { useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';

import { cn } from '@/lib/utils';
import { formatDateTime } from '@/lib/platform';
import type { Notification } from '@/lib/types';

function getNotificationTypeLabel(type?: string) {
  switch (type) {
    case 'pass_update':
      return 'Pass update';
    case 'pass_request':
      return 'Request';
    case 'pass_approved':
      return 'Approved';
    case 'pass_rejected':
      return 'Rejected';
    case 'return_update':
      return 'Return';
    case 'account_review':
      return 'Account';
    default:
      return 'Notice';
  }
}

export function NotificationCenter({
  notifications,
  emptyLabel = 'No notifications yet.',
  className,
  bodyClassName,
}: {
  notifications: Notification[];
  emptyLabel?: string;
  className?: string;
  bodyClassName?: string;
}) {
  const [openId, setOpenId] = useState<string | null>(notifications[0]?.id || null);

  const sortedNotifications = useMemo(() => notifications, [notifications]);

  return (
    <div className={cn('flex h-72 min-h-0 flex-col overflow-hidden rounded-[1rem] border border-white/70 bg-slate-50/90', className)}>
      {sortedNotifications.length ? (
        <div className={cn('min-h-0 flex-1 space-y-2 overflow-y-auto p-2.5', bodyClassName)}>
          {sortedNotifications.map((notification) => {
            const isOpen = openId === notification.id;

            return (
              <div
                key={notification.id}
                className={cn(
                  'rounded-[0.9rem] border bg-white transition-colors',
                  notification.read ? 'border-slate-200' : 'border-emerald-200 bg-emerald-50/35',
                )}
              >
                <button
                  type="button"
                  onClick={() => setOpenId((current) => (current === notification.id ? null : notification.id))}
                  className="flex w-full items-start justify-between gap-3 px-3 py-3 text-left"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-slate-500">
                      <span>{getNotificationTypeLabel(notification.type)}</span>
                      <span className="text-slate-300">•</span>
                      <span>{formatDateTime(notification.createdAt)}</span>
                    </div>
                    <p className="mt-1 text-sm font-semibold leading-5 text-slate-950">{notification.title}</p>
                  </div>
                  <ChevronDown
                    className={cn(
                      'mt-0.5 h-4 w-4 flex-shrink-0 text-slate-500 transition-transform duration-200',
                      isOpen ? 'rotate-180' : '',
                    )}
                  />
                </button>
                {isOpen ? (
                  <div className="border-t border-slate-100 bg-slate-50/80 px-3 py-3 text-sm leading-6 text-slate-600 dark:border-white/10 dark:bg-[#0c1a2d] dark:text-[#c5d7ee]">
                    {notification.message}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex h-full items-center justify-center px-4 text-sm text-slate-500">
          {emptyLabel}
        </div>
      )}
    </div>
  );
}
