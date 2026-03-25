import type { Pass, PassRequest, PassStatus, PassType, UserRole } from "@/lib/types";

type PassLike = Pick<Pass, "status" | "chaplainApproval" | "hallAdminApproval">;

const roleLabels: Record<UserRole, string> = {
  student: "Student",
  hall_admin: "Hall Admin",
  chaplaincy: "Chaplaincy",
  security: "Security",
  super_admin: "Super Admin",
};

const passTypeLabels: Record<PassType, string> = {
  short: "Short Pass",
  long: "Long Pass",
  holiday: "Holiday Pass",
};

const baseStatusMeta: Record<
  PassStatus,
  {
    label: string;
    tone: string;
    surface: string;
  }
> = {
  pending: {
    label: "Pending",
    tone: "text-amber-800",
    surface: "border-amber-200 bg-amber-50",
  },
  approved: {
    label: "Approved",
    tone: "text-emerald-800",
    surface: "border-emerald-200 bg-emerald-50",
  },
  rejected: {
    label: "Rejected",
    tone: "text-rose-800",
    surface: "border-rose-200 bg-rose-50",
  },
  expired: {
    label: "Expired",
    tone: "text-slate-700",
    surface: "border-slate-200 bg-slate-100",
  },
  completed: {
    label: "Completed",
    tone: "text-sky-800",
    surface: "border-sky-200 bg-sky-50",
  },
  chaplaincy_required: {
    label: "Awaiting Chaplaincy",
    tone: "text-violet-800",
    surface: "border-violet-200 bg-violet-50",
  },
};

export function getRoleLabel(role?: UserRole | null) {
  return role ? roleLabels[role] : "Guest";
}

export function getPassTypeLabel(type?: PassType | null) {
  return type ? passTypeLabels[type] : "Pass";
}

export function getPassStatusMeta(pass: PassLike) {
  if (pass.status === "chaplaincy_required" || !pass.chaplainApproval) {
    return baseStatusMeta.chaplaincy_required;
  }

  if (pass.status === "pending" && !pass.hallAdminApproval) {
    return {
      label: "Awaiting Hall Admin",
      tone: "text-amber-800",
      surface: "border-amber-200 bg-amber-50",
    };
  }

  return baseStatusMeta[pass.status];
}

export function formatDateTime(value?: string | null) {
  if (!value) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function formatDate(value?: string | null) {
  if (!value) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "full",
  }).format(new Date(value));
}

export function formatShortDate(value?: string | null) {
  if (!value) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export function formatCompactDate(value?: string | null) {
  if (!value) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

export function formatDurationDays(start?: string | null, end?: string | null) {
  if (!start || !end) {
    return "Not available";
  }

  const diff = new Date(end).getTime() - new Date(start).getTime();
  const days = Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));

  return `${days} day${days === 1 ? "" : "s"}`;
}

export function countPassesByStatus<T extends Pick<Pass | PassRequest, "status">>(
  passes: T[],
  status: PassStatus,
) {
  return passes.filter((pass) => pass.status === status).length;
}

export function isPassCurrentlyActive(pass: Pick<Pass, "status" | "departureDate" | "expectedReturnDate">) {
  if (pass.status !== "approved") {
    return false;
  }

  const now = Date.now();
  return (
    new Date(pass.departureDate).getTime() <= now &&
    new Date(pass.expectedReturnDate).getTime() >= now
  );
}
