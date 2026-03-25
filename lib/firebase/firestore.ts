import { Timestamp } from "firebase/firestore";

import type {
  ApprovalRecord,
  ApprovalStatus,
  Announcement,
  Hostel,
  Notification,
  Pass,
  PassRequest,
  PassVerificationResult,
  ScanLog,
  StaffInvite,
  User,
  UserRole,
} from "@/lib/types";

type UnknownRecord = Record<string, unknown>;

export function toIsoString(value: unknown, fallback = new Date(0).toISOString()) {
  if (!value) {
    return fallback;
  }

  if (typeof value === "string") {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }

  if (
    typeof value === "object" &&
    value !== null &&
    "seconds" in value &&
    typeof (value as { seconds?: unknown }).seconds === "number"
  ) {
    return new Date(((value as { seconds: number }).seconds || 0) * 1000).toISOString();
  }

  return fallback;
}

function mapEmbeddedUser(studentId: string, value?: unknown) {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const data = value as UnknownRecord;

  return {
    id: typeof data.id === "string" ? data.id : studentId,
    name: typeof data.name === "string" ? data.name : "Unknown User",
    email: typeof data.email === "string" ? data.email : "",
    matric: typeof data.matric === "string" ? data.matric : "",
    role: (typeof data.role === "string" ? data.role : "student") as User["role"],
    hostel: typeof data.hostel === "string" ? data.hostel : undefined,
    room: typeof data.room === "string" ? data.room : undefined,
    department: typeof data.department === "string" ? data.department : undefined,
    faculty: typeof data.faculty === "string" ? data.faculty : undefined,
    level: typeof data.level === "string" ? data.level : undefined,
    phone: typeof data.phone === "string" ? data.phone : undefined,
    guardianPhone: typeof data.guardianPhone === "string" ? data.guardianPhone : undefined,
    photo: typeof data.photo === "string" ? data.photo : undefined,
    permissions: Array.isArray(data.permissions)
      ? data.permissions.filter((permission): permission is string => typeof permission === "string")
      : undefined,
  } satisfies User;
}

function mapApprovalRecord(value?: unknown, fallbackRole: UserRole = "hall_admin") {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const data = value as UnknownRecord;

  return {
    approvedBy: typeof data.approvedBy === "string" ? data.approvedBy : "",
    approverRole:
      (typeof data.approverRole === "string" ? data.approverRole : fallbackRole) as UserRole,
    approvedAt: toIsoString(data.approvedAt),
    status: (typeof data.status === "string" ? data.status : "approved") as ApprovalStatus,
    reason: typeof data.reason === "string" ? data.reason : undefined,
  } satisfies ApprovalRecord;
}

export function mapUser(id: string, value: UnknownRecord): User {
  return {
    id,
    name: typeof value.name === "string" ? value.name : "Unnamed User",
    email: typeof value.email === "string" ? value.email : "",
    matric: typeof value.matric === "string" ? value.matric : "",
    role: (typeof value.role === "string" ? value.role : "student") as User["role"],
    hostel: typeof value.hostel === "string" ? value.hostel : undefined,
    room: typeof value.room === "string" ? value.room : undefined,
    department: typeof value.department === "string" ? value.department : undefined,
    faculty: typeof value.faculty === "string" ? value.faculty : undefined,
    level: typeof value.level === "string" ? value.level : undefined,
    phone: typeof value.phone === "string" ? value.phone : undefined,
    guardianPhone: typeof value.guardianPhone === "string" ? value.guardianPhone : undefined,
    photo: typeof value.photo === "string" ? value.photo : undefined,
    permissions: Array.isArray(value.permissions)
      ? value.permissions.filter((permission): permission is string => typeof permission === "string")
      : undefined,
    createdAt: toIsoString(value.createdAt, new Date().toISOString()),
    updatedAt: toIsoString(value.updatedAt, new Date().toISOString()),
    disabled: Boolean(value.disabled),
  };
}

export function mapPassRequest(id: string, value: UnknownRecord): PassRequest {
  return {
    id,
    studentId: typeof value.studentId === "string" ? value.studentId : "",
    student: mapEmbeddedUser(
      typeof value.studentId === "string" ? value.studentId : "",
      value.studentSnapshot,
    ),
    type: (typeof value.type === "string" ? value.type : "short") as PassRequest["type"],
    destination: typeof value.destination === "string" ? value.destination : "",
    reason: typeof value.reason === "string" ? value.reason : "",
    departureDate: toIsoString(value.departureDate),
    expectedReturnDate: toIsoString(value.expectedReturnDate),
    status: (typeof value.status === "string" ? value.status : "pending") as PassRequest["status"],
    rejectionReason:
      typeof value.rejectionReason === "string" ? value.rejectionReason : undefined,
    approvedAt: value.approvedAt ? toIsoString(value.approvedAt) : undefined,
    currentStage:
      typeof value.currentStage === "string"
        ? (value.currentStage as PassRequest["currentStage"])
        : undefined,
    chaplainApproval: mapApprovalRecord(value.chaplainApproval, "chaplaincy"),
    hallAdminApproval: mapApprovalRecord(value.hallAdminApproval, "hall_admin"),
    createdAt: toIsoString(value.createdAt, new Date().toISOString()),
    updatedAt: toIsoString(value.updatedAt, new Date().toISOString()),
  };
}

export function mapPass(id: string, value: UnknownRecord): Pass {
  return {
    id,
    requestId: typeof value.requestId === "string" ? value.requestId : undefined,
    studentId: typeof value.studentId === "string" ? value.studentId : "",
    student: mapEmbeddedUser(
      typeof value.studentId === "string" ? value.studentId : "",
      value.studentSnapshot,
    ),
    type: (typeof value.type === "string" ? value.type : "short") as Pass["type"],
    destination: typeof value.destination === "string" ? value.destination : "",
    reason: typeof value.reason === "string" ? value.reason : "",
    departureDate: toIsoString(value.departureDate),
    expectedReturnDate: toIsoString(value.expectedReturnDate),
    actualReturnDate: value.actualReturnDate ? toIsoString(value.actualReturnDate) : undefined,
    status: (typeof value.status === "string" ? value.status : "pending") as Pass["status"],
    currentStage:
      typeof value.currentStage === "string" ? (value.currentStage as Pass["currentStage"]) : undefined,
    qrCode: typeof value.qrCode === "string" ? value.qrCode : undefined,
    hallAdminApproval: mapApprovalRecord(value.hallAdminApproval, "hall_admin"),
    chaplainApproval: mapApprovalRecord(value.chaplainApproval, "chaplaincy"),
    createdAt: toIsoString(value.createdAt, new Date().toISOString()),
    updatedAt: toIsoString(value.updatedAt, new Date().toISOString()),
  };
}

export function mapNotification(id: string, value: UnknownRecord): Notification {
  return {
    id,
    userId: typeof value.userId === "string" ? value.userId : "",
    type: typeof value.type === "string" ? value.type : "info",
    title: typeof value.title === "string" ? value.title : "",
    message: typeof value.message === "string" ? value.message : "",
    read: Boolean(value.read),
    createdAt: toIsoString(value.createdAt, new Date().toISOString()),
  };
}

export function mapAnnouncement(id: string, value: UnknownRecord): Announcement {
  return {
    id,
    title: typeof value.title === "string" ? value.title : "",
    message: typeof value.message === "string" ? value.message : "",
    recipientRole:
      typeof value.recipientRole === "string"
        ? (value.recipientRole as Announcement["recipientRole"])
        : undefined,
    createdBy: typeof value.createdBy === "string" ? value.createdBy : "",
    createdAt: toIsoString(value.createdAt, new Date().toISOString()),
  };
}

export function mapScanLog(id: string, value: UnknownRecord): ScanLog {
  return {
    id,
    qrCode: typeof value.qrCode === "string" ? value.qrCode : "",
    passId: typeof value.passId === "string" ? value.passId : undefined,
    studentId: typeof value.studentId === "string" ? value.studentId : undefined,
    location: typeof value.location === "string" ? value.location : "",
    status:
      value.status === "failed" ? "failed" : "success",
    timestamp: toIsoString(value.timestamp, new Date().toISOString()),
  };
}

export function requestToPassRecord(request: PassRequest): Pass {
  return {
    id: request.id,
    requestId: request.id,
    studentId: request.studentId,
    student: request.student,
    type: request.type,
    destination: request.destination,
    reason: request.reason,
    departureDate: request.departureDate,
    expectedReturnDate: request.expectedReturnDate,
    status: request.status,
    currentStage: request.currentStage,
    hallAdminApproval: request.hallAdminApproval,
    chaplainApproval: request.chaplainApproval,
    createdAt: request.createdAt,
    updatedAt: request.updatedAt,
  };
}

export function mapHostel(id: string, value: UnknownRecord): Hostel {
  return {
    id,
    name: typeof value.name === "string" ? value.name : id,
    slug: typeof value.slug === "string" ? value.slug : id,
    hallAdminEmail:
      typeof value.hallAdminEmail === "string" ? value.hallAdminEmail : undefined,
    createdBy: typeof value.createdBy === "string" ? value.createdBy : "",
    createdAt: toIsoString(value.createdAt, new Date().toISOString()),
    updatedAt: toIsoString(value.updatedAt, new Date().toISOString()),
  };
}

export function mapStaffInvite(id: string, value: UnknownRecord): StaffInvite {
  return {
    id,
    email: typeof value.email === "string" ? value.email : "",
    name: typeof value.name === "string" ? value.name : undefined,
    role: (typeof value.role === "string" ? value.role : "hall_admin") as StaffInvite["role"],
    hostel: typeof value.hostel === "string" ? value.hostel : undefined,
    hostelId: typeof value.hostelId === "string" ? value.hostelId : undefined,
    status: (typeof value.status === "string" ? value.status : "pending") as StaffInvite["status"],
    createdBy: typeof value.createdBy === "string" ? value.createdBy : "",
    claimedBy: typeof value.claimedBy === "string" ? value.claimedBy : undefined,
    claimedAt: value.claimedAt ? toIsoString(value.claimedAt) : undefined,
    createdAt: toIsoString(value.createdAt, new Date().toISOString()),
    updatedAt: toIsoString(value.updatedAt, new Date().toISOString()),
  };
}

export function sortByCreatedAtDesc<T extends { createdAt: string }>(items: T[]) {
  return [...items].sort(
    (left, right) =>
      new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  );
}

export function mapPassVerificationResult(value: UnknownRecord): PassVerificationResult {
  return {
    pass:
      value.pass && typeof value.pass === "object"
        ? mapPass(
            typeof (value.pass as UnknownRecord).id === "string"
              ? ((value.pass as UnknownRecord).id as string)
              : "verified-pass",
            value.pass as UnknownRecord,
          )
        : null,
    isValid: Boolean(value.isValid),
    message: typeof value.message === "string" ? value.message : "Verification completed.",
  };
}
