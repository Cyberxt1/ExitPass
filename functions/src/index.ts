import { randomBytes } from 'node:crypto';

import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, Timestamp, getFirestore } from 'firebase-admin/firestore';
import { setGlobalOptions } from 'firebase-functions/v2/options';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

initializeApp();

const db = getFirestore();
const auth = getAuth();

setGlobalOptions({
  region: process.env.FUNCTIONS_REGION || 'us-central1',
  maxInstances: 10,
});

type UserRole = 'student' | 'hall_admin' | 'chaplaincy' | 'security' | 'super_admin';
type PassType = 'short' | 'long' | 'holiday';
type PassStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'cancelled'
  | 'expired'
  | 'completed'
  | 'chaplaincy_required';
type ApprovalStage = 'chaplaincy' | 'hall_admin' | 'completed';
type StaffInviteStatus = 'pending' | 'claimed' | 'revoked';
type AccountApprovalStatus = 'pending' | 'approved' | 'rejected';

type UserProfile = {
  name: string;
  email: string;
  matric: string;
  matricNormalized?: string;
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
  disabled?: boolean;
  approvalStatus?: AccountApprovalStatus;
  approvalReviewedBy?: string;
  approvalReviewedAt?: unknown;
  rejectionReason?: string;
};

type HostelRecord = {
  name: string;
  slug: string;
  hallAdminEmail?: string;
  createdBy: string;
  createdAt: unknown;
  updatedAt: unknown;
};

type StaffInviteRecord = {
  email: string;
  name?: string;
  role: Exclude<UserRole, 'student' | 'super_admin'>;
  hostel?: string;
  hostelId?: string;
  status: StaffInviteStatus;
  createdBy: string;
  claimedBy?: string;
  claimedAt?: unknown;
  createdAt: unknown;
  updatedAt: unknown;
};

const ADMIN_ROLES: UserRole[] = ['hall_admin', 'chaplaincy', 'super_admin'];
const PRIVILEGED_ROLES: UserRole[] = [...ADMIN_ROLES, 'security'];

const PRIMARY_ROLE_EMAILS: Record<'super_admin' | 'security' | 'chaplaincy', string> = {
  super_admin: 'oluokundavid4@gmail.com',
  security: 'xplick@gmail.com',
  chaplaincy: 'blyinkr4@gmail.com',
};

const PRIMARY_EMAIL_TO_ROLE = new Map<UserRole, string>(
  Object.entries(PRIMARY_ROLE_EMAILS).map(([role, email]) => [role as UserRole, normalizeEmail(email)]),
);

const callableOptions = {
  cors: true,
};

function serializeForClient<T>(value: T): T {
  if (value instanceof Timestamp) {
    return value.toDate().toISOString() as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) => serializeForClient(item)) as T;
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).map(([key, nextValue]) => [
      key,
      serializeForClient(nextValue),
    ]);
    return Object.fromEntries(entries) as T;
  }

  return value;
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function normalizeMatric(value: string) {
  return value.trim().replace(/\s+/g, '').toUpperCase();
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function isValidStudentMatric(value: string) {
  return /^[0-9]{2}\/[0-9]{4}$/.test(value);
}

function isValidStudentLevel(value: string) {
  return ['100', '200', '300', '400', '500'].includes(value);
}

function normalizeRoom(value: string) {
  return value.trim().replace(/\s+/g, '').toUpperCase();
}

function isValidRoomCode(value: string) {
  return /^[A-L](?:[1-9]|1\d|2[0-5])$/.test(normalizeRoom(value));
}

const FACULTY_DEPARTMENTS: Record<string, string[]> = {
  FOS: [
    'Biochemistry',
    'Biology',
    'Chemistry',
    'Computer Science',
    'Mathematics',
    'Microbiology',
    'Physics',
    'Statistics',
  ],
  FBMS: ['Anatomy', 'Medical Laboratory Science', 'Nursing Science', 'Physiology', 'Public Health'],
  FBSS: [
    'Accounting',
    'Business Administration',
    'Economics',
    'International Relations',
    'Mass Communication',
    'Political Science',
    'Sociology',
  ],
  FOE: [
    'Chemical Engineering',
    'Civil Engineering',
    'Computer Engineering',
    'Electrical and Electronics Engineering',
    'Mechanical Engineering',
    'Mechatronics Engineering',
  ],
  FOA: [
    'English and Literary Studies',
    'Fine Arts',
    'History and International Studies',
    'Music',
    'Philosophy',
    'Theatre Arts',
  ],
  FOL: ['Law'],
};

function isValidFacultyDepartment(faculty: string, department: string) {
  return FACULTY_DEPARTMENTS[faculty]?.includes(department) || false;
}

function parseDate(value: unknown, fieldName: string) {
  if (typeof value !== 'string') {
    throw new HttpsError('invalid-argument', `${fieldName} must be an ISO date string.`);
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    throw new HttpsError('invalid-argument', `${fieldName} is not a valid date.`);
  }

  return parsed;
}

function generateTemporaryPassword() {
  return `ExitPass!${randomBytes(4).toString('hex')}`;
}

function generateStaffReference(role: UserRole) {
  const prefixMap: Record<UserRole, string> = {
    student: 'STD',
    hall_admin: 'HAL',
    chaplaincy: 'CHP',
    security: 'SEC',
    super_admin: 'SUP',
  };

  return `${prefixMap[role]}-${randomBytes(3).toString('hex').toUpperCase()}`;
}

function defaultPermissions(role: UserRole) {
  switch (role) {
    case 'super_admin':
      return ['approve_passes', 'manage_students', 'manage_admins', 'view_analytics', 'manage_hostels'];
    case 'hall_admin':
      return ['approve_passes', 'manage_students', 'view_analytics'];
    case 'chaplaincy':
      return ['approve_passes', 'send_updates', 'manage_staff'];
    case 'security':
      return ['scan_passes', 'view_history', 'manage_staff'];
    default:
      return [];
  }
}

function isStaffRole(role: UserRole) {
  return ['hall_admin', 'chaplaincy', 'security', 'super_admin'].includes(role);
}

function getCurrentApprovalStage(requestData: Record<string, unknown>): ApprovalStage {
  if (
    requestData.currentStage === 'chaplaincy' ||
    requestData.currentStage === 'hall_admin' ||
    requestData.currentStage === 'completed'
  ) {
    return requestData.currentStage;
  }

  const status = String(requestData.status || 'chaplaincy_required') as PassStatus;

  if (status === 'approved' || status === 'rejected' || status === 'completed' || status === 'expired') {
    return 'completed';
  }

  if (status === 'chaplaincy_required') {
    return 'chaplaincy';
  }

  if (status === 'pending' && requestData.chaplainApproval) {
    return 'hall_admin';
  }

  return 'chaplaincy';
}

async function getUserProfile(uid: string) {
  const snapshot = await db.collection('users').doc(uid).get();

  if (!snapshot.exists) {
    const firebaseUser = await auth.getUser(uid);
    return {
      id: uid,
      name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
      email: firebaseUser.email || '',
      matric: '',
      role: ((firebaseUser.customClaims?.role as UserRole) || 'student') as UserRole,
      photo: firebaseUser.photoURL || undefined,
      permissions: [],
    };
  }

  return {
    id: snapshot.id,
    ...(snapshot.data() as UserProfile),
  };
}

async function ensureAuthenticated(request: Parameters<typeof onCall>[0] extends never ? never : any) {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'You must be signed in to call this function.');
  }

  const profile = await getUserProfile(request.auth.uid);
  const role =
    ((request.auth.token.role as UserRole | undefined) || profile.role || 'student') as UserRole;

  return {
    uid: request.auth.uid,
    role,
    profile,
  };
}

async function ensureRole(
  request: Parameters<typeof onCall>[0] extends never ? never : any,
  allowedRoles: UserRole[],
) {
  const caller = await ensureAuthenticated(request);

  if (!allowedRoles.includes(caller.role)) {
    throw new HttpsError('permission-denied', 'You do not have access to perform this action.');
  }

  return caller;
}

function toStudentSnapshot(profile: Awaited<ReturnType<typeof getUserProfile>>) {
  return {
    id: profile.id,
    name: profile.name,
    email: profile.email,
    matric: profile.matric,
    role: profile.role,
    hostel: profile.hostel || '',
    room: profile.room || '',
    department: profile.department || '',
    faculty: profile.faculty || '',
    level: profile.level || '',
    phone: profile.phone || '',
    guardianPhone: profile.guardianPhone || '',
    photo: profile.photo || '',
  };
}

async function findStudentByMatric(rawMatric: string) {
  const matric = normalizeMatric(rawMatric);

  if (!matric) {
    return null;
  }

  const normalizedSnapshot = await db
    .collection('users')
    .where('role', '==', 'student')
    .where('matricNormalized', '==', matric)
    .limit(1)
    .get();

  if (!normalizedSnapshot.empty) {
    return normalizedSnapshot.docs[0];
  }

  const exactSnapshot = await db
    .collection('users')
    .where('role', '==', 'student')
    .where('matric', '==', rawMatric.trim())
    .limit(1)
    .get();

  if (!exactSnapshot.empty) {
    return exactSnapshot.docs[0];
  }

  const fallbackSnapshot = await db.collection('users').where('role', '==', 'student').get();

  return (
    fallbackSnapshot.docs.find(
      (doc) => normalizeMatric(String((doc.data() as UserProfile).matric || '')) === matric,
    ) || null
  );
}

async function createNotification(userId: string, title: string, message: string, type = 'info') {
  await db.collection('notifications').add({
    userId,
    type,
    title,
    message,
    read: false,
    createdAt: FieldValue.serverTimestamp(),
  });
}

async function fetchPassByQrCode(qrCode: string) {
  const snapshot = await db.collection('passes').where('qrCode', '==', qrCode).limit(1).get();

  if (snapshot.empty) {
    return null;
  }

  return snapshot.docs[0];
}

async function assertStudentSignupEmailAllowed(email: string) {
  if ([...PRIMARY_EMAIL_TO_ROLE.values()].includes(email)) {
    throw new HttpsError(
      'failed-precondition',
      'This email is reserved for staff setup. Use the staff join page instead.',
    );
  }

  const inviteSnapshot = await db.collection('staffInvites').where('email', '==', email).get();
  const hasPendingInvite = inviteSnapshot.docs.some(
    (doc) => (doc.data() as StaffInviteRecord).status === 'pending',
  );

  if (hasPendingInvite) {
    throw new HttpsError(
      'failed-precondition',
      'This email already has a staff invite. Use the staff join link instead of student signup.',
    );
  }
}

async function assertAuthEmailAvailable(email: string) {
  try {
    await auth.getUserByEmail(email);
    throw new HttpsError('already-exists', 'An account with this email already exists.');
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: string }).code === 'auth/user-not-found'
    ) {
      return;
    }

    if (error instanceof HttpsError) {
      throw error;
    }

    throw error;
  }
}

async function ensureHostelRecord(hostelId: string) {
  const snapshot = await db.collection('hostels').doc(hostelId).get();

  if (!snapshot.exists) {
    throw new HttpsError('not-found', 'Selected hostel does not exist.');
  }

  return snapshot;
}

function ensureInviteRoleAllowed(callerRole: UserRole, inviteRole: string) {
  if (callerRole === 'super_admin') {
    return ['hall_admin', 'chaplaincy', 'security'].includes(inviteRole);
  }

  if (callerRole === 'chaplaincy') {
    return inviteRole === 'chaplaincy';
  }

  if (callerRole === 'security') {
    return inviteRole === 'security';
  }

  return false;
}

function createApprovalRecord(
  caller: Awaited<ReturnType<typeof ensureAuthenticated>>,
  status: 'approved' | 'rejected',
  reason?: string,
) {
  return {
    approvedBy: caller.uid,
    approverRole: caller.role,
    approvedAt: FieldValue.serverTimestamp(),
    status,
    ...(reason ? { reason } : {}),
  };
}

function ensureApprovalActorForStage(
  caller: Awaited<ReturnType<typeof ensureAuthenticated>>,
  stage: ApprovalStage,
  requestData: Record<string, unknown>,
) {
  if (caller.role === 'super_admin') {
    return;
  }

  if (stage === 'chaplaincy' && caller.role !== 'chaplaincy') {
    throw new HttpsError('permission-denied', 'Only chapel can review this request at this stage.');
  }

  if (stage === 'hall_admin' && caller.role !== 'hall_admin') {
    throw new HttpsError('permission-denied', 'Only a hall admin can finish approval at this stage.');
  }

  if (caller.role === 'hall_admin' && caller.profile.hostel) {
    const studentSnapshot =
      requestData.studentSnapshot && typeof requestData.studentSnapshot === 'object'
        ? (requestData.studentSnapshot as Record<string, unknown>)
        : null;
    const studentHostel = typeof studentSnapshot?.hostel === 'string' ? studentSnapshot.hostel : '';

    if (
      studentHostel &&
      caller.profile.hostel &&
      studentHostel.trim().toLowerCase() !== caller.profile.hostel.trim().toLowerCase()
    ) {
      throw new HttpsError(
        'permission-denied',
        'Hall admins can only approve requests from students in their own hostel.',
      );
    }
  }
}

export const validateStudentSignupEmail = onCall(callableOptions, async (request) => {
  const payload = request.data as Record<string, unknown>;
  const email = normalizeEmail(String(payload.email || ''));

  if (!email) {
    throw new HttpsError('invalid-argument', 'email is required.');
  }

  await assertStudentSignupEmailAllowed(email);

  return {
    allowed: true,
  };
});

export const lookupStudentAccess = onCall(callableOptions, async (request) => {
  const payload = request.data as Record<string, unknown>;
  const matric = normalizeMatric(String(payload.matric || ''));

  if (!matric) {
    throw new HttpsError('invalid-argument', 'matric is required.');
  }

  const snapshot = await findStudentByMatric(matric);

  if (!snapshot) {
    return {
      exists: false,
      user: null,
    };
  }

  const data = snapshot.data() as UserProfile;

  return {
    exists: true,
    user: {
      id: snapshot.id,
      name: data.name || 'Student',
      email: data.email || '',
      matric: data.matric || matric,
      department: data.department || '',
      faculty: data.faculty || '',
      level: data.level || '',
      hostel: data.hostel || '',
      room: data.room || '',
    },
  };
});

export const createStudentAccount = onCall(callableOptions, async (request) => {
  const payload = request.data as Record<string, unknown>;
  const name = String(payload.name || '').trim();
  const email = normalizeEmail(String(payload.email || ''));
  const matric = String(payload.matric || '').trim();
  const matricNormalized = normalizeMatric(matric);
  const department = String(payload.department || '').trim();
  const faculty = String(payload.faculty || '').trim().toUpperCase();
  const level = String(payload.level || '').trim();
  const hostel = String(payload.hostel || '').trim();
  const room = normalizeRoom(String(payload.room || ''));
  const phone = String(payload.phone || '').trim();
  const guardianPhone = String(payload.guardianPhone || '').trim();
  const password = String(payload.password || '');

  if (!name || !email || !matricNormalized || !department || !faculty || !level || !hostel || !room || !phone || !guardianPhone) {
    throw new HttpsError('invalid-argument', 'All student profile fields are required.');
  }

  if (password.length < 8) {
    throw new HttpsError('invalid-argument', 'Password must be at least 8 characters long.');
  }

  if (!isValidStudentMatric(matricNormalized)) {
    throw new HttpsError('invalid-argument', 'Student ID must be in the format 12/3456.');
  }

  if (!isValidStudentLevel(level)) {
    throw new HttpsError('invalid-argument', 'Select a valid level between 100 and 500.');
  }

  if (!isValidFacultyDepartment(faculty, department)) {
    throw new HttpsError('invalid-argument', 'Select a department that matches the chosen faculty.');
  }

  if (!isValidRoomCode(room)) {
    throw new HttpsError('invalid-argument', 'Room number must be a letter A to L followed by a number from 1 to 25.');
  }

  const existingStudent = await findStudentByMatric(matricNormalized);

  if (existingStudent) {
    throw new HttpsError('already-exists', 'A student account already exists for that ID.');
  }

  await assertStudentSignupEmailAllowed(email);
  await assertAuthEmailAvailable(email);

  const createdUser = await auth.createUser({
    email,
    password,
    displayName: name,
  });

  await auth.setCustomUserClaims(createdUser.uid, { role: 'student' });

  const studentRecord = {
    name,
    nameChangeCount: 0,
    email,
    matric: matricNormalized,
    matricNormalized,
    role: 'student',
    department,
    faculty,
    level: Number(level),
    hostel,
    room,
    phone,
    guardianPhone,
    permissions: [],
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    disabled: false,
  };

  await db.collection('users').doc(createdUser.uid).set(studentRecord);
  await db
    .collection('studentAccessDirectory')
    .doc(matricNormalized.replace('/', ''))
    .set({
      directoryId: matricNormalized.replace('/', ''),
      userId: createdUser.uid,
      role: 'student',
      name,
      email,
      matric: matricNormalized,
      matricNormalized,
      department,
      faculty,
      level: Number(level),
      hostel,
      room,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  await createNotification(
    createdUser.uid,
    'Welcome to ExitPass',
    'Your account is ready. Chapel will review your requests before they move to your hall admin.',
    'welcome',
  );

  const snapshot = await db.collection('users').doc(createdUser.uid).get();

  return {
    user: {
      id: snapshot.id,
      ...serializeForClient(snapshot.data() || {}),
    },
  };
});

export const registerStaffAccount = onCall(callableOptions, async (request) => {
  const payload = request.data as Record<string, unknown>;
  const name = String(payload.name || '').trim();
  const email = normalizeEmail(String(payload.email || ''));
  const password = String(payload.password || '');
  const directRole = String(payload.directRole || '').trim() as UserRole;
  const token = String(payload.token || '').trim();

  if (!name || !email || password.length < 8) {
    throw new HttpsError('invalid-argument', 'Valid name, email, and password are required.');
  }

  let role: UserRole | undefined;
  let hostel = '';
  let hostelId = '';
  let approvalStatus: AccountApprovalStatus = 'pending';
  let inviteSnapshot:
    | FirebaseFirestore.DocumentSnapshot<FirebaseFirestore.DocumentData>
    | null = null;

  if (token) {
    inviteSnapshot = await db.collection('staffInvites').doc(token).get();

    if (!inviteSnapshot.exists) {
      throw new HttpsError('not-found', 'This invite link is invalid or no longer available.');
    }

    const inviteData = inviteSnapshot.data() as StaffInviteRecord;

    if (inviteData.status !== 'pending') {
      throw new HttpsError('failed-precondition', 'This invite has already been used or revoked.');
    }

    if (normalizeEmail(inviteData.email) !== email) {
      throw new HttpsError('invalid-argument', 'Use the invited email address to complete this signup.');
    }

    role = inviteData.role;
    hostel = inviteData.hostel || '';
    hostelId = inviteData.hostelId || '';
    approvalStatus = 'approved';
  } else {
    role = directRole;

    if (!role || role === 'student' || role === 'super_admin') {
      throw new HttpsError(
        'invalid-argument',
        'Choose a valid staff portal to create this account.',
      );
    }
  }

  await assertAuthEmailAvailable(email);

  const createdUser = await auth.createUser({
    email,
    password,
    displayName: name,
  });

  await auth.setCustomUserClaims(createdUser.uid, { role });

  const userRecord = {
    name,
    email,
    matric: generateStaffReference(role),
    role,
    hostel,
    permissions: defaultPermissions(role),
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    disabled: false,
    approvalStatus,
    ...(approvalStatus === 'approved'
      ? {
          approvalReviewedAt: FieldValue.serverTimestamp(),
        }
      : {}),
  };

  await db.collection('users').doc(createdUser.uid).set(userRecord);

  if (inviteSnapshot?.exists) {
    await inviteSnapshot.ref.update({
      status: 'claimed',
      claimedBy: createdUser.uid,
      claimedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    if (role === 'hall_admin' && hostelId) {
      await db.collection('hostels').doc(hostelId).set(
        {
          hallAdminEmail: email,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    }
  }

  if (approvalStatus === 'approved') {
    await createNotification(
      createdUser.uid,
      'Staff access enabled',
      'Your staff account is ready. You can now sign in and start working in the platform.',
      'welcome',
    );
  } else {
    await createNotification(
      createdUser.uid,
      'Approval pending',
      'Your staff account request has been received and is waiting for super admin approval.',
      'account_review',
    );
  }

  const snapshot = await db.collection('users').doc(createdUser.uid).get();

  return {
    user: {
      id: snapshot.id,
      ...serializeForClient(snapshot.data() || {}),
    },
  };
});

export const createHostel = onCall(callableOptions, async (request) => {
  const caller = await ensureRole(request, ['super_admin']);
  const payload = request.data as Record<string, unknown>;
  const name = String(payload.name || '').trim();
  const slug = slugify(name);

  if (!name || !slug) {
    throw new HttpsError('invalid-argument', 'Hostel name is required.');
  }

  const hostelRef = db.collection('hostels').doc(slug);
  const existing = await hostelRef.get();

  if (existing.exists) {
    throw new HttpsError('already-exists', 'A hostel with this name already exists.');
  }

  const hostelRecord: HostelRecord = {
    name,
    slug,
    createdBy: caller.uid,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };

  await hostelRef.set(hostelRecord);
  const snapshot = await hostelRef.get();

  return {
    hostel: {
      id: snapshot.id,
      ...serializeForClient(snapshot.data() || {}),
    },
  };
});

export const createStaffInvite = onCall(callableOptions, async (request) => {
  const caller = await ensureRole(request, ['super_admin', 'chaplaincy', 'security']);
  const payload = request.data as Record<string, unknown>;
  const email = normalizeEmail(String(payload.email || ''));
  const name = String(payload.name || '').trim();
  const role = String(payload.role || '').trim() as Exclude<UserRole, 'student' | 'super_admin'>;
  const hostelId = String(payload.hostelId || '').trim();

  if (!email || !role || !ensureInviteRoleAllowed(caller.role, role)) {
    throw new HttpsError('permission-denied', 'You cannot create an invite for that role.');
  }

  if (role === 'hall_admin' && !hostelId) {
    throw new HttpsError('invalid-argument', 'Hall admin invites must be tied to a hostel.');
  }

  if ([...PRIMARY_EMAIL_TO_ROLE.values()].includes(email)) {
    throw new HttpsError('failed-precondition', 'That email is reserved for a lead staff account.');
  }

  await assertAuthEmailAvailable(email);

  const pendingInviteSnapshot = await db.collection('staffInvites').where('email', '==', email).get();
  const hasPendingInvite = pendingInviteSnapshot.docs.some(
    (doc) => (doc.data() as StaffInviteRecord).status === 'pending',
  );

  if (hasPendingInvite) {
    throw new HttpsError('already-exists', 'There is already an active invite for this email.');
  }

  let hostel = '';

  if (hostelId) {
    const hostelSnapshot = await ensureHostelRecord(hostelId);
    hostel = String((hostelSnapshot.data() as HostelRecord).name || '');
  }

  const token = randomBytes(18).toString('hex');
  const inviteRef = db.collection('staffInvites').doc(token);

  const inviteRecord: StaffInviteRecord = {
    email,
    name,
    role,
    hostel,
    hostelId,
    status: 'pending',
    createdBy: caller.uid,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };

  await inviteRef.set(inviteRecord);
  const snapshot = await inviteRef.get();

  return {
    invite: {
      id: snapshot.id,
      ...serializeForClient(snapshot.data() || {}),
    },
  };
});

export const getStaffInviteDetails = onCall(callableOptions, async (request) => {
  const payload = request.data as Record<string, unknown>;
  const token = String(payload.token || '').trim();

  if (!token) {
    throw new HttpsError('invalid-argument', 'token is required.');
  }

  const snapshot = await db.collection('staffInvites').doc(token).get();

  if (!snapshot.exists) {
    return { invite: null };
  }

  const data = snapshot.data() as StaffInviteRecord;

  if (data.status !== 'pending') {
    return { invite: null };
  }

  return {
    invite: {
      id: snapshot.id,
      ...serializeForClient(data),
    },
  };
});

export const submitPassRequest = onCall(callableOptions, async (request) => {
  const caller = await ensureRole(request, ['student']);
  const payload = request.data as Record<string, unknown>;
  const departureDate = parseDate(payload.departureDate, 'departureDate');
  const expectedReturnDate = parseDate(payload.expectedReturnDate, 'expectedReturnDate');

  if (expectedReturnDate <= departureDate) {
    throw new HttpsError('invalid-argument', 'Return time must be after departure time.');
  }

  const destination = String(payload.destination || '').trim();
  const reason = String(payload.reason || '').trim();
  const type = String(payload.type || '') as PassType;

  if (!destination || !reason || !['short', 'long', 'holiday'].includes(type)) {
    throw new HttpsError('invalid-argument', 'Pass request details are incomplete.');
  }

  const requestRef = await db.collection('passRequests').add({
    studentId: caller.uid,
    studentSnapshot: toStudentSnapshot(caller.profile),
    type,
    destination,
    reason,
    departureDate: Timestamp.fromDate(departureDate),
    expectedReturnDate: Timestamp.fromDate(expectedReturnDate),
    status: 'chaplaincy_required',
    currentStage: 'chaplaincy',
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    createdBy: caller.uid,
  });

  await createNotification(
    caller.uid,
    'Pass Request Submitted',
    'Your request has been submitted. Chapel will review it first before your hall admin gives final approval.',
    'pass_request',
  );

  const createdRequest = await requestRef.get();
  return {
    request: {
      id: createdRequest.id,
      ...serializeForClient(createdRequest.data() || {}),
    },
  };
});

export const approvePassRequest = onCall(callableOptions, async (request) => {
  const caller = await ensureRole(request, ADMIN_ROLES);
  const payload = request.data as Record<string, unknown>;
  const requestId = String(payload.requestId || '').trim();

  if (!requestId) {
    throw new HttpsError('invalid-argument', 'requestId is required.');
  }

  const requestRef = db.collection('passRequests').doc(requestId);
  const passRef = db.collection('passes').doc(requestId);
  let notificationTitle = '';
  let notificationMessage = '';
  let studentId = '';

  await db.runTransaction(async (transaction) => {
    const requestSnapshot = await transaction.get(requestRef);

    if (!requestSnapshot.exists) {
      throw new HttpsError('not-found', 'Pass request not found.');
    }

    const requestData = requestSnapshot.data() as Record<string, unknown>;
    const status = String(requestData.status || 'chaplaincy_required') as PassStatus;
    const currentStage = getCurrentApprovalStage(requestData);

    if (status === 'approved') {
      return;
    }

    if (status === 'rejected') {
      throw new HttpsError('failed-precondition', 'Rejected requests cannot be approved.');
    }

    ensureApprovalActorForStage(caller, currentStage, requestData);
    studentId = typeof requestData.studentId === 'string' ? requestData.studentId : '';

    if (currentStage === 'chaplaincy') {
      const approvalRecord = createApprovalRecord(caller, 'approved');

      transaction.update(requestRef, {
        status: 'pending',
        currentStage: 'hall_admin',
        chaplainApproval: approvalRecord,
        updatedAt: FieldValue.serverTimestamp(),
      });

      notificationTitle = 'Chapel approved your request';
      notificationMessage = 'Your request passed chapel review and is now waiting for your hall admin.';
      return;
    }

    const approvalRecord = createApprovalRecord(caller, 'approved');

    transaction.update(requestRef, {
      status: 'approved',
      currentStage: 'completed',
      approvedAt: FieldValue.serverTimestamp(),
      hallAdminApproval: approvalRecord,
      updatedAt: FieldValue.serverTimestamp(),
    });

    transaction.set(passRef, {
      requestId,
      studentId: requestData.studentId,
      studentSnapshot: requestData.studentSnapshot,
      type: requestData.type,
      destination: requestData.destination,
      reason: requestData.reason,
      departureDate: requestData.departureDate,
      expectedReturnDate: requestData.expectedReturnDate,
      status: 'approved',
      currentStage: 'completed',
      qrCode: `PASS_${requestId}_${randomBytes(6).toString('hex')}`,
      hallAdminApproval: approvalRecord,
      chaplainApproval: requestData.chaplainApproval,
      createdAt: requestData.createdAt || FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    notificationTitle = 'Pass Request Approved';
    notificationMessage = 'Your hall admin approved the request. Your QR pass is now ready.';
  });

  const approvedRequest = await requestRef.get();
  const approvedData = approvedRequest.data() as Record<string, unknown>;

  if (studentId) {
    await createNotification(studentId, notificationTitle, notificationMessage, 'pass_approved');
  }

  return {
    request: {
      id: approvedRequest.id,
      ...serializeForClient(approvedData || {}),
    },
  };
});

export const rejectPassRequest = onCall(callableOptions, async (request) => {
  const caller = await ensureRole(request, ADMIN_ROLES);
  const payload = request.data as Record<string, unknown>;
  const requestId = String(payload.requestId || '').trim();
  const reason = String(payload.reason || '').trim();

  if (!requestId || !reason) {
    throw new HttpsError('invalid-argument', 'requestId and reason are required.');
  }

  const requestRef = db.collection('passRequests').doc(requestId);
  let studentId = '';
  let notificationTitle = '';
  let notificationMessage = '';

  await db.runTransaction(async (transaction) => {
    const requestSnapshot = await transaction.get(requestRef);

    if (!requestSnapshot.exists) {
      throw new HttpsError('not-found', 'Pass request not found.');
    }

    const requestData = requestSnapshot.data() as Record<string, unknown>;
    const status = String(requestData.status || 'chaplaincy_required') as PassStatus;
    const currentStage = getCurrentApprovalStage(requestData);

    if (status === 'approved') {
      throw new HttpsError('failed-precondition', 'Approved requests cannot be rejected.');
    }

    ensureApprovalActorForStage(caller, currentStage, requestData);
    studentId = typeof requestData.studentId === 'string' ? requestData.studentId : '';

    transaction.update(requestRef, {
      status: 'rejected',
      currentStage: 'completed',
      rejectionReason: reason,
      updatedAt: FieldValue.serverTimestamp(),
      ...(currentStage === 'chaplaincy'
        ? { chaplainApproval: createApprovalRecord(caller, 'rejected', reason) }
        : { hallAdminApproval: createApprovalRecord(caller, 'rejected', reason) }),
    });

    notificationTitle =
      currentStage === 'chaplaincy' ? 'Chapel denied your request' : 'Hall admin denied your request';
    notificationMessage = `Reason: ${reason}`;
  });

  const rejectedRequest = await requestRef.get();
  const rejectedData = rejectedRequest.data() as Record<string, unknown>;

  if (studentId) {
    await createNotification(studentId, notificationTitle, notificationMessage, 'pass_rejected');
  }

  return {
    request: {
      id: rejectedRequest.id,
      ...serializeForClient(rejectedData || {}),
    },
  };
});

export const cancelPassRequest = onCall(callableOptions, async (request) => {
  const caller = await ensureRole(request, ['student']);
  const payload = request.data as Record<string, unknown>;
  const requestId = String(payload.requestId || '').trim();

  if (!requestId) {
    throw new HttpsError('invalid-argument', 'requestId is required.');
  }

  const requestRef = db.collection('passRequests').doc(requestId);

  await db.runTransaction(async (transaction) => {
    const requestSnapshot = await transaction.get(requestRef);

    if (!requestSnapshot.exists) {
      throw new HttpsError('not-found', 'Pass request not found.');
    }

    const requestData = requestSnapshot.data() as Record<string, unknown>;
    const studentId = typeof requestData.studentId === 'string' ? requestData.studentId : '';
    const status = String(requestData.status || 'chaplaincy_required') as PassStatus;

    if (studentId !== caller.uid) {
      throw new HttpsError('permission-denied', 'You can only cancel your own request.');
    }

    if (!['chaplaincy_required', 'pending'].includes(status)) {
      throw new HttpsError('failed-precondition', 'Only requests still in review can be cancelled.');
    }

    transaction.update(requestRef, {
      status: 'cancelled',
      currentStage: 'completed',
      rejectionReason: 'Cancelled by student.',
      updatedAt: FieldValue.serverTimestamp(),
    });
  });

  await createNotification(
    caller.uid,
    'Pass request cancelled',
    'Your pass request has been cancelled and removed from the approval flow.',
    'pass_update',
  );

  const cancelledRequest = await requestRef.get();

  return {
    request: {
      id: cancelledRequest.id,
      ...serializeForClient(cancelledRequest.data() || {}),
    },
  };
});

export const createAdminUser = onCall(callableOptions, async (request) => {
  await ensureRole(request, ['super_admin']);
  const payload = request.data as Record<string, unknown>;
  const name = String(payload.name || '').trim();
  const email = normalizeEmail(String(payload.email || ''));
  const role = String(payload.role || '') as UserRole;
  const temporaryPassword = generateTemporaryPassword();

  if (!name || !email || !PRIVILEGED_ROLES.includes(role) || role === 'student') {
    throw new HttpsError('invalid-argument', 'Valid admin details are required.');
  }

  await assertAuthEmailAvailable(email);

  const createdUser = await auth.createUser({
    email,
    password: temporaryPassword,
    displayName: name,
  });

  await auth.setCustomUserClaims(createdUser.uid, { role });

  const userRecord = {
    name,
    email,
    matric: generateStaffReference(role),
    role,
    hostel: String(payload.hostel || ''),
    permissions: Array.isArray(payload.permissions)
      ? payload.permissions.filter((permission): permission is string => typeof permission === 'string')
      : defaultPermissions(role),
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    disabled: false,
    approvalStatus: 'approved' as const,
    approvalReviewedBy: request.auth?.uid || '',
    approvalReviewedAt: FieldValue.serverTimestamp(),
  };

  await db.collection('users').doc(createdUser.uid).set(userRecord);
  const snapshot = await db.collection('users').doc(createdUser.uid).get();

  return {
    user: {
      id: createdUser.uid,
      ...serializeForClient(snapshot.data() || {}),
    },
    temporaryPassword,
  };
});

export const approveStaffAccount = onCall(callableOptions, async (request) => {
  const caller = await ensureRole(request, ['super_admin']);
  const payload = request.data as Record<string, unknown>;
  const userId = String(payload.userId || '').trim();

  if (!userId) {
    throw new HttpsError('invalid-argument', 'userId is required.');
  }

  const userRef = db.collection('users').doc(userId);
  const snapshot = await userRef.get();

  if (!snapshot.exists) {
    throw new HttpsError('not-found', 'User account not found.');
  }

  const userData = snapshot.data() as UserProfile;

  if (!isStaffRole(userData.role) || userData.role === 'super_admin') {
    throw new HttpsError('failed-precondition', 'Only staff accounts can be approved here.');
  }

  await userRef.update({
    approvalStatus: 'approved',
    approvalReviewedBy: caller.uid,
    approvalReviewedAt: FieldValue.serverTimestamp(),
    rejectionReason: FieldValue.delete(),
    disabled: false,
    updatedAt: FieldValue.serverTimestamp(),
  });

  await auth.updateUser(userId, { disabled: false });
  await createNotification(
    userId,
    'Staff account approved',
    'Your staff account has been approved by the super admin. You can now sign in.',
    'account_review',
  );

  const updatedSnapshot = await userRef.get();

  return {
    user: {
      id: updatedSnapshot.id,
      ...serializeForClient(updatedSnapshot.data() || {}),
    },
  };
});

export const rejectStaffAccount = onCall(callableOptions, async (request) => {
  const caller = await ensureRole(request, ['super_admin']);
  const payload = request.data as Record<string, unknown>;
  const userId = String(payload.userId || '').trim();
  const reason = String(payload.reason || '').trim();

  if (!userId || !reason) {
    throw new HttpsError('invalid-argument', 'userId and reason are required.');
  }

  const userRef = db.collection('users').doc(userId);
  const snapshot = await userRef.get();

  if (!snapshot.exists) {
    throw new HttpsError('not-found', 'User account not found.');
  }

  const userData = snapshot.data() as UserProfile;

  if (!isStaffRole(userData.role) || userData.role === 'super_admin') {
    throw new HttpsError('failed-precondition', 'Only staff accounts can be rejected here.');
  }

  await userRef.update({
    approvalStatus: 'rejected',
    approvalReviewedBy: caller.uid,
    approvalReviewedAt: FieldValue.serverTimestamp(),
    rejectionReason: reason,
    disabled: true,
    updatedAt: FieldValue.serverTimestamp(),
  });

  await auth.updateUser(userId, { disabled: true });
  await createNotification(
    userId,
    'Staff account rejected',
    `Your staff account request was rejected. Reason: ${reason}`,
    'account_review',
  );

  const updatedSnapshot = await userRef.get();

  return {
    user: {
      id: updatedSnapshot.id,
      ...serializeForClient(updatedSnapshot.data() || {}),
    },
  };
});

export const removeAdminUser = onCall(callableOptions, async (request) => {
  const caller = await ensureRole(request, ['super_admin']);
  const payload = request.data as Record<string, unknown>;
  const adminId = String(payload.adminId || '').trim();

  if (!adminId) {
    throw new HttpsError('invalid-argument', 'adminId is required.');
  }

  if (caller.uid === adminId) {
    throw new HttpsError('failed-precondition', 'You cannot remove your own admin account.');
  }

  await db.collection('users').doc(adminId).update({
    disabled: true,
    updatedAt: FieldValue.serverTimestamp(),
  });
  await auth.updateUser(adminId, { disabled: true });

  return { success: true };
});

export const deleteUserAccount = onCall(callableOptions, async (request) => {
  const caller = await ensureRole(request, ['super_admin']);
  const payload = request.data as Record<string, unknown>;
  const userId = String(payload.userId || '').trim();

  if (!userId) {
    throw new HttpsError('invalid-argument', 'userId is required.');
  }

  if (caller.uid === userId) {
    throw new HttpsError('failed-precondition', 'You cannot delete your own account.');
  }

  const userRef = db.collection('users').doc(userId);
  const snapshot = await userRef.get();

  if (!snapshot.exists) {
    throw new HttpsError('not-found', 'User account not found.');
  }

  const userData = snapshot.data() as UserProfile;

  if (userData.role === 'student') {
    const matricNormalized = normalizeMatric(userData.matric || '');

    if (matricNormalized) {
      await db.collection('studentAccessDirectory').doc(matricNormalized.replace('/', '')).delete();
    }
  }

  if (userData.role === 'hall_admin' && userData.email) {
    const hostelsSnapshot = await db
      .collection('hostels')
      .where('hallAdminEmail', '==', userData.email)
      .get();

    for (const hostel of hostelsSnapshot.docs) {
      await hostel.ref.update({
        hallAdminEmail: FieldValue.delete(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
  }

  await userRef.delete();
  await auth.deleteUser(userId);

  return { success: true };
});

export const setUserPasswordByAdmin = onCall(callableOptions, async (request) => {
  const caller = await ensureRole(request, ['super_admin']);
  const payload = request.data as Record<string, unknown>;
  const userId = String(payload.userId || '').trim();
  const requestedPassword = String(payload.password || '').trim();
  const temporaryPassword = requestedPassword || generateTemporaryPassword();

  if (!userId) {
    throw new HttpsError('invalid-argument', 'userId is required.');
  }

  if (caller.uid === userId) {
    throw new HttpsError('failed-precondition', 'Use the normal account settings flow to change your own password.');
  }

  if (temporaryPassword.length < 8) {
    throw new HttpsError('invalid-argument', 'Password must be at least 8 characters long.');
  }

  await auth.updateUser(userId, { password: temporaryPassword, disabled: false });

  await db.collection('users').doc(userId).set(
    {
      disabled: false,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  return {
    temporaryPassword,
  };
});

export const updateAdminUser = onCall(callableOptions, async (request) => {
  await ensureRole(request, ['super_admin']);
  const payload = request.data as Record<string, unknown>;
  const adminId = String(payload.adminId || '').trim();
  const updates = (payload.data || {}) as Record<string, unknown>;

  if (!adminId) {
    throw new HttpsError('invalid-argument', 'adminId is required.');
  }

  const allowedUpdates: Record<string, unknown> = {};

  for (const key of ['name', 'hostel', 'photo', 'disabled']) {
    if (key in updates) {
      allowedUpdates[key] = updates[key];
    }
  }

  if (typeof updates.role === 'string' && PRIVILEGED_ROLES.includes(updates.role as UserRole)) {
    allowedUpdates.role = updates.role;
    await auth.setCustomUserClaims(adminId, { role: updates.role });
  }

  if (Array.isArray(updates.permissions)) {
    allowedUpdates.permissions = updates.permissions.filter(
      (permission): permission is string => typeof permission === 'string',
    );
  }

  allowedUpdates.updatedAt = FieldValue.serverTimestamp();

  await db.collection('users').doc(adminId).update(allowedUpdates);
  const snapshot = await db.collection('users').doc(adminId).get();

  return {
    user: {
      id: snapshot.id,
      ...serializeForClient(snapshot.data() || {}),
    },
  };
});

export const sendAnnouncement = onCall(callableOptions, async (request) => {
  const caller = await ensureRole(request, ADMIN_ROLES);
  const payload = request.data as Record<string, unknown>;
  const title = String(payload.title || '').trim();
  const message = String(payload.message || '').trim();
  const recipientRole = payload.recipientRole ? String(payload.recipientRole) : undefined;

  if (!title || !message) {
    throw new HttpsError('invalid-argument', 'Announcement title and message are required.');
  }

  const announcementRef = await db.collection('announcements').add({
    title,
    message,
    recipientRole,
    createdBy: caller.uid,
    createdAt: FieldValue.serverTimestamp(),
  });

  const snapshot = await announcementRef.get();

  return {
    announcement: {
      id: snapshot.id,
      ...serializeForClient(snapshot.data() || {}),
    },
  };
});

export const sendNotification = onCall(callableOptions, async (request) => {
  await ensureRole(request, ADMIN_ROLES);
  const payload = request.data as Record<string, unknown>;
  const userId = String(payload.userId || '').trim();
  const title = String(payload.title || '').trim();
  const message = String(payload.message || '').trim();

  if (!userId || !title || !message) {
    throw new HttpsError('invalid-argument', 'Notification details are incomplete.');
  }

  const notificationRef = await db.collection('notifications').add({
    userId,
    title,
    message,
    type: 'info',
    read: false,
    createdAt: FieldValue.serverTimestamp(),
  });

  const snapshot = await notificationRef.get();

  return {
    notification: {
      id: snapshot.id,
      ...serializeForClient(snapshot.data() || {}),
    },
  };
});

export const getAnalytics = onCall(callableOptions, async (request) => {
  await ensureRole(request, PRIVILEGED_ROLES);

  const [studentsSnapshot, requestsSnapshot, passesSnapshot, scansSnapshot] = await Promise.all([
    db.collection('users').where('role', '==', 'student').get(),
    db.collection('passRequests').get(),
    db.collection('passes').get(),
    db.collection('scans').get(),
  ]);

  const now = Date.now();
  const requests = requestsSnapshot.docs.map((doc) => doc.data());
  const passes = passesSnapshot.docs.map((doc) => doc.data());

  const trend = Array.from({ length: 7 }, (_, index) => {
    const current = new Date();
    current.setHours(0, 0, 0, 0);
    current.setDate(current.getDate() - (6 - index));

    const next = new Date(current);
    next.setDate(next.getDate() + 1);

    const label = current.toLocaleDateString('en-US', { weekday: 'short' });

    const matchingRequests = requests.filter((item) => {
      const createdAt = item.createdAt instanceof Timestamp ? item.createdAt.toDate() : null;
      return createdAt && createdAt >= current && createdAt < next;
    });

    const approved = requests.filter((item) => {
      const approvedAt = item.approvedAt instanceof Timestamp ? item.approvedAt.toDate() : null;
      return item.status === 'approved' && approvedAt && approvedAt >= current && approvedAt < next;
    }).length;

    const rejected = requests.filter((item) => {
      const updatedAt = item.updatedAt instanceof Timestamp ? item.updatedAt.toDate() : null;
      return item.status === 'rejected' && updatedAt && updatedAt >= current && updatedAt < next;
    }).length;

    return {
      day: label,
      requests: matchingRequests.length,
      approved,
      rejected,
    };
  });

  return {
    totalStudents: studentsSnapshot.size,
    totalRequests: requestsSnapshot.size,
    approvedCount: passes.filter((item) => item.status === 'approved').length,
    pendingCount: requests.filter((item) => ['pending', 'chaplaincy_required'].includes(item.status)).length,
    rejectedCount: requests.filter((item) => item.status === 'rejected').length,
    passesScanned: scansSnapshot.size,
    activePassesCount: passes.filter((item) => {
      const departureDate =
        item.departureDate instanceof Timestamp ? item.departureDate.toDate().getTime() : 0;
      const expectedReturnDate =
        item.expectedReturnDate instanceof Timestamp
          ? item.expectedReturnDate.toDate().getTime()
          : 0;
      return item.status === 'approved' && departureDate <= now && expectedReturnDate >= now;
    }).length,
    trend,
  };
});

export const verifyPassQrCode = onCall(callableOptions, async (request) => {
  await ensureRole(request, PRIVILEGED_ROLES);
  const payload = request.data as Record<string, unknown>;
  const qrCode = String(payload.qrCode || '').trim();

  if (!qrCode) {
    throw new HttpsError('invalid-argument', 'qrCode is required.');
  }

  const passSnapshot = await fetchPassByQrCode(qrCode);

  if (!passSnapshot) {
    return {
      pass: null,
      isValid: false,
      message: 'QR Code not found or invalid.',
    };
  }

  const pass = passSnapshot.data();
  const departureDate =
    pass.departureDate instanceof Timestamp ? pass.departureDate.toDate().getTime() : 0;
  const expectedReturnDate =
    pass.expectedReturnDate instanceof Timestamp ? pass.expectedReturnDate.toDate().getTime() : 0;
  const isValid =
    pass.status === 'approved' && departureDate <= Date.now() && expectedReturnDate >= Date.now();

  if (!isValid && pass.status === 'approved' && expectedReturnDate < Date.now()) {
    await passSnapshot.ref.update({
      status: 'expired',
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  return {
    pass: {
      id: passSnapshot.id,
      ...serializeForClient(pass),
    },
    isValid,
    message: isValid ? 'Pass verified successfully.' : 'Pass is invalid or expired.',
  };
});

export const logPassScan = onCall(callableOptions, async (request) => {
  await ensureRole(request, PRIVILEGED_ROLES);
  const payload = request.data as Record<string, unknown>;
  const qrCode = String(payload.qrCode || '').trim();
  const location = String(payload.location || 'Main Gate').trim();

  if (!qrCode) {
    throw new HttpsError('invalid-argument', 'qrCode is required.');
  }

  const passSnapshot = await fetchPassByQrCode(qrCode);
  const pass = passSnapshot?.data();
  const status = pass ? 'success' : 'failed';

  const scanRef = await db.collection('scans').add({
    qrCode,
    passId: passSnapshot?.id || null,
    studentId: pass?.studentId || null,
    location,
    status,
    timestamp: FieldValue.serverTimestamp(),
  });

  const snapshot = await scanRef.get();

  return {
    scan: {
      id: snapshot.id,
      ...serializeForClient(snapshot.data() || {}),
    },
  };
});
