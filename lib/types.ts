export type UserRole =
  | "student"
  | "hall_admin"
  | "chaplaincy"
  | "security"
  | "super_admin";

export type PassType = "short" | "long" | "holiday";

export type PassStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "expired"
  | "completed"
  | "chaplaincy_required";

export type ApprovalStatus = "pending" | "approved" | "rejected";
export type ApprovalStage = "chaplaincy" | "hall_admin" | "completed";
export type StaffInviteStatus = "pending" | "claimed" | "revoked";

export type ISODateString = string;

export interface User {
  id: string;
  name: string;
  email: string;
  matric: string;
  role: UserRole;
  hostel?: string;
  room?: string;
  department?: string;
  faculty?: string;
  level?: string;
  phone?: string;
  guardianPhone?: string;
  photo?: string;
  permissions?: string[];
  createdAt?: ISODateString;
  updatedAt?: ISODateString;
  disabled?: boolean;
}

export interface ApprovalRecord {
  approvedBy: string;
  approverRole: UserRole;
  approvedAt: ISODateString;
  status: ApprovalStatus;
  reason?: string;
}

export interface PassRequest {
  id: string;
  studentId: string;
  student?: User;
  type: PassType;
  destination: string;
  reason: string;
  departureDate: ISODateString;
  expectedReturnDate: ISODateString;
  status: PassStatus;
  rejectionReason?: string;
  approvedAt?: ISODateString;
  currentStage?: ApprovalStage;
  chaplainApproval?: ApprovalRecord;
  hallAdminApproval?: ApprovalRecord;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface Pass {
  id: string;
  requestId?: string;
  studentId: string;
  student?: User;
  type: PassType;
  destination: string;
  reason: string;
  departureDate: ISODateString;
  expectedReturnDate: ISODateString;
  actualReturnDate?: ISODateString;
  status: PassStatus;
  currentStage?: ApprovalStage;
  qrCode?: string;
  hallAdminApproval?: ApprovalRecord;
  chaplainApproval?: ApprovalRecord;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: ISODateString;
}

export interface Announcement {
  id: string;
  title: string;
  message: string;
  recipientRole?: UserRole;
  createdBy: string;
  createdAt: ISODateString;
}

export interface ScanLog {
  id: string;
  qrCode: string;
  passId?: string;
  studentId?: string;
  location: string;
  status: "success" | "failed";
  timestamp: ISODateString;
}

export interface AnalyticsTrendPoint {
  day: string;
  requests: number;
  approved: number;
  rejected: number;
}

export interface AnalyticsSummary {
  totalStudents: number;
  totalRequests: number;
  approvedCount: number;
  pendingCount: number;
  rejectedCount: number;
  passesScanned: number;
  activePassesCount: number;
  trend: AnalyticsTrendPoint[];
}

export interface PassVerificationResult {
  pass: Pass | null;
  isValid: boolean;
  message: string;
}

export interface SubmitPassRequestInput {
  studentId: string;
  type: PassType;
  destination: string;
  reason: string;
  departureDate: Date | ISODateString;
  expectedReturnDate: Date | ISODateString;
}

export interface CreateAdminInput {
  name: string;
  email: string;
  role: Exclude<UserRole, "student">;
  permissions?: string[];
  hostel?: string;
}

export interface Hostel {
  id: string;
  name: string;
  slug: string;
  hallAdminEmail?: string;
  createdBy: string;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface StaffInvite {
  id: string;
  email: string;
  name?: string;
  role: Exclude<UserRole, "student">;
  hostel?: string;
  hostelId?: string;
  status: StaffInviteStatus;
  createdBy: string;
  claimedBy?: string;
  claimedAt?: ISODateString;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface CreateStaffInviteInput {
  email: string;
  name?: string;
  role: Exclude<UserRole, "student" | "super_admin">;
  hostelId?: string;
}

export interface RegisterStaffInput {
  email: string;
  name: string;
  password: string;
  token?: string;
}

export interface StaffInviteLookup {
  invite: StaffInvite | null;
}

export interface StudentSignupInput {
  name: string;
  email: string;
  matric: string;
  department: string;
  faculty: string;
  level: string;
  hostel: string;
  room: string;
  phone: string;
  guardianPhone: string;
  password: string;
}

export interface CreatedAdminResult {
  user: User;
  temporaryPassword: string;
}

export interface StudentDetails extends User {
  totalRequests: number;
  approvedPasses: number;
  passHistory: Pass[];
}

export interface StudentAccessLookup {
  exists: boolean;
  user: Pick<
    User,
    "id" | "name" | "email" | "matric" | "department" | "faculty" | "level" | "hostel" | "room"
  > | null;
}
