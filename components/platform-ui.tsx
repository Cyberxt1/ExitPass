"use client";

import type { LucideIcon } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function PageHero({
  eyebrow,
  title,
  description: _description,
  actions,
  children,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <Card
      className={cn(
        "brand-panel overflow-hidden border",
        className,
      )}
    >
      <CardContent className="p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl min-w-0">
            {eyebrow ? (
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-500">
                {eyebrow}
              </p>
            ) : null}
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
              {title}
            </h1>
          </div>
          {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
        </div>
        {children ? <div className="mt-5">{children}</div> : null}
      </CardContent>
    </Card>
  );
}

export function MetricCard({
  label,
  value,
  description: _description,
  icon: Icon,
  accentClassName,
}: {
  label: string;
  value: string | number;
  description?: string;
  icon: LucideIcon;
  accentClassName?: string;
}) {
  return (
    <Card className="brand-panel border">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-500">
              {label}
            </p>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">{value}</p>
          </div>
          <div
            className={cn(
              "brand-icon-chip rounded-xl border p-2.5",
              accentClassName,
            )}
          >
            <Icon className="h-4.5 w-4.5 text-slate-900" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function StatusBadge({
  label,
  tone,
  className,
}: {
  label: string;
  tone?: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold tracking-[0.01em]",
        tone ?? "border-slate-200 bg-slate-100 text-slate-700",
        className,
      )}
    >
      {label}
    </span>
  );
}

export function LoadingPanel({ label }: { label: string }) {
  return (
    <Card className="brand-panel-soft border">
      <CardContent className="flex min-h-24 items-center justify-center p-5 text-sm text-slate-500">
        {label}
      </CardContent>
    </Card>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <Card className="brand-panel border">
      <CardContent className="flex min-h-32 flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md">
          <p className="text-lg font-semibold text-slate-950">{title}</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
          {action ? <div className="mt-4">{action}</div> : null}
        </div>
      </CardContent>
    </Card>
  );
}

export function DetailBlock({
  label,
  value,
  className,
}: {
  label: string;
  value: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("brand-panel-soft rounded-[1rem] border p-4", className)}>
      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <div className="mt-2 text-sm leading-6 text-slate-900">{value}</div>
    </div>
  );
}

export function SectionCard({
  title,
  description: _description,
  children,
  action,
  className,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("brand-panel border", className)}>
      <CardHeader className="flex flex-col gap-3 pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle className="text-lg font-semibold text-slate-950">{title}</CardTitle>
        </div>
        {action}
      </CardHeader>
      <CardContent className="pt-0">{children}</CardContent>
    </Card>
  );
}
