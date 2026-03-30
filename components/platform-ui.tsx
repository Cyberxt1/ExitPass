"use client";

import type { LucideIcon } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function PageHero({
  eyebrow,
  title,
  description,
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
        "brand-panel overflow-hidden border backdrop-blur-xl",
        className,
      )}
    >
      <CardContent className="relative p-6 sm:p-8">
        <div className="brand-topline absolute inset-x-0 top-0 h-1" />
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            {eyebrow ? (
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
                {eyebrow}
              </p>
            ) : null}
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
              {title}
            </h1>
            {description ? (
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
                {description}
              </p>
            ) : null}
          </div>
          {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
        </div>
        {children ? <div className="mt-6">{children}</div> : null}
      </CardContent>
    </Card>
  );
}

export function MetricCard({
  label,
  value,
  description,
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
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
              {label}
            </p>
            <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{value}</p>
          </div>
          <div
            className={cn(
              "brand-icon-chip rounded-2xl border p-3",
              accentClassName,
            )}
          >
            <Icon className="h-5 w-5 text-slate-900" />
          </div>
        </div>
        {description ? <p className="mt-4 text-sm leading-6 text-slate-600">{description}</p> : null}
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
        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold",
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
      <CardContent className="flex min-h-40 items-center justify-center p-8 text-sm text-slate-500">
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
      <CardContent className="flex min-h-56 flex-col items-center justify-center p-8 text-center">
        <div className="max-w-md">
          <p className="text-xl font-semibold text-slate-950">{title}</p>
          <p className="mt-3 text-sm leading-7 text-slate-600">{description}</p>
          {action ? <div className="mt-5">{action}</div> : null}
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
    <div className={cn("brand-panel-soft rounded-[1.5rem] border p-4", className)}>
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">{label}</p>
      <div className="mt-2 text-sm leading-6 text-slate-900">{value}</div>
    </div>
  );
}

export function SectionCard({
  title,
  description,
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
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle className="text-xl font-semibold text-slate-950">{title}</CardTitle>
          {description ? <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p> : null}
        </div>
        {action}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
